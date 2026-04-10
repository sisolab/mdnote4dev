import { useState, useEffect, useCallback, useRef } from "react";
import { exists, mkdir, create, readDir as tauriReadDir, readTextFile, rename } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/stores/appStore";
import { FileTree } from "./FileTree";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { Tooltip } from "@/components/ui/Tooltip";
import { Unlink, ChevronRight, Folder, Tag, ChevronsDownUp, ChevronsUpDown, ArrowUpDown, FilePlus, FolderPlus, FileText, FolderOpen, ListCollapse, icons } from "lucide-react";
import { IconPicker } from "@/components/settings/IconPicker";
import { shortenPath } from "@/utils/pathUtils";
import { executeUndoable } from "@/stores/undoStore";
export function Sidebar() {
  const { favorites, sidebarCollapsed, removeFavorite, addFavorite, openTab, refreshFileTree, fileTreeVersion, setFavoriteAlias, updateFavoritePath, setFavoriteIcon, folderSort, fileSort, setFolderSort, setFileSort, favoriteFiles, addFavoriteFile, removeFavoriteFile, selectedPaths, reorderFavorites } = useAppStore();
  const [searchQuery] = useState("");
  const [compactMode, setCompactMode] = useState(false);
  const [foldersWithResults, setFoldersWithResults] = useState<Set<string>>(new Set());
  const [sortMenu, setSortMenu] = useState<{ x: number; y: number } | null>(null);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [aliasEditing, setAliasEditing] = useState<string | null>(null);
  const [aliasValue, setAliasValue] = useState("");
  const [folderRenaming, setFolderRenaming] = useState<string | null>(null);
  const [folderRenameValue, setFolderRenameValue] = useState("");
  // ── 최상위 폴더 드래그 순서 변경 ──
  const [dragFav, setDragFav] = useState<{ from: number; over: number; pos: "above" | "below" } | null>(null);
  const dragFavState = useRef<{ startY: number; from: number; to: number; pos: "above" | "below"; active: boolean }>({ startY: 0, from: -1, to: -1, pos: "below", active: false });

  const startFavDrag = (e: React.MouseEvent, idx: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startY = e.clientY;
    dragFavState.current = { startY, from: idx, to: -1, pos: "below", active: false };

    const onMove = (me: MouseEvent) => {
      me.preventDefault();
      const s = dragFavState.current;
      if (!s.active && Math.abs(me.clientY - s.startY) > 5) {
        s.active = true;
        setDragFav({ from: idx, over: -1, pos: "below" });
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      const s = dragFavState.current;
      if (s.active && s.to >= 0 && s.from !== s.to) {
        const rawInsert = s.pos === "above" ? s.to : s.to + 1;
        const insertAt = rawInsert > s.from ? rawInsert - 1 : rawInsert;
        if (insertAt !== s.from) {
          const f = s.from, t = insertAt;
          executeUndoable({
            type: "reorder-favorites",
            description: "즐겨찾기 폴더 순서 변경",
            execute: async () => reorderFavorites(f, t),
            undo: async () => reorderFavorites(t, f),
          });
        }
      }
      dragFavState.current = { startY: 0, from: -1, to: -1, pos: "below", active: false };
      setDragFav(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const updateFavDragTarget = (e: React.MouseEvent, favIdx: number) => {
    if (!dragFavState.current.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? "above" : "below";
    dragFavState.current.to = favIdx;
    dragFavState.current.pos = pos;
    setDragFav({ from: dragFavState.current.from, over: favIdx, pos });
  };
  const [iconPickerPath, setIconPickerPath] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.max(180, Math.min(500, startWidth + (e.clientX - startX)));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [sidebarWidth]);
  const [expandedFavs, setExpandedFavs] = useState<Set<string>>(
    new Set(favorites.map((f) => f.path))
  );
  const [brokenPaths, setBrokenPaths] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);

  // 폴더 유효성 체크
  const checkFolders = useCallback(async () => {
    const broken = new Set<string>();
    for (const fav of favorites) {
      try {
        const valid = await exists(fav.path);
        if (!valid) broken.add(fav.path);
      } catch {
        broken.add(fav.path);
      }
    }
    setBrokenPaths(broken);
  }, [favorites]);

  // 문서 수 카운트
  useEffect(() => {
    const countDocs = async (path: string): Promise<number> => {
      try {
        const entries = await tauriReadDir(path);
        let count = 0;
        for (const entry of entries) {
          if (!entry.name || entry.name.startsWith(".")) continue;
          if (!entry.isDirectory && /\.(md|markdown)$/i.test(entry.name)) count++;
          if (entry.isDirectory) count += await countDocs(`${path}\\${entry.name}`);
        }
        return count;
      } catch { return 0; }
    };
    const update = async () => {
      const counts: Record<string, number> = {};
      for (const fav of favorites) {
        if (!brokenPaths.has(fav.path)) {
          counts[fav.path] = await countDocs(fav.path);
        }
      }
      setDocCounts(counts);
    };
    update();
  }, [favorites, brokenPaths, fileTreeVersion]);

  // 검색 시 결과 있는 폴더 체크
  useEffect(() => {
    if (!searchQuery) { setFoldersWithResults(new Set()); return; }
    const q = searchQuery.toLowerCase();
    const check = async () => {
      const result = new Set<string>();
      const searchRecursive = async (path: string): Promise<boolean> => {
        try {
          const entries = await tauriReadDir(path);
          for (const entry of entries) {
            if (!entry.isDirectory && entry.name && entry.name.toLowerCase().includes(q)) return true;
            if (entry.isDirectory && entry.name && !entry.name.startsWith(".")) {
              if (await searchRecursive(`${path}\\${entry.name}`)) return true;
            }
          }
        } catch {}
        return false;
      };
      for (const fav of favorites) {
        if (!brokenPaths.has(fav.path) && await searchRecursive(fav.path)) {
          result.add(fav.path);
        }
      }
      setFoldersWithResults(result);
    };
    check();
  }, [searchQuery, favorites, brokenPaths]);

  // 앱 시작 시 폴더 유효성 체크
  useEffect(() => {
    checkFolders();
  }, [checkFolders]);

  // 깨진 폴더는 자동으로 접기
  useEffect(() => {
    if (brokenPaths.size === 0) return;
    setExpandedFavs((prev) => {
      const next = new Set(prev);
      brokenPaths.forEach((p) => next.delete(p));
      return next;
    });
  }, [brokenPaths]);

  const handleFolderRename = async (oldPath: string) => {
    if (!folderRenameValue.trim() || !folderRenaming) {
      setFolderRenaming(null);
      return;
    }
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf("\\"));
    const newPath = `${parentPath}\\${folderRenameValue.trim()}`;
    if (newPath === oldPath) {
      setFolderRenaming(null);
      return;
    }
    try {
      await rename(oldPath, newPath);
      // 즐겨찾기 경로 업데이트 (위치 유지)
      updateFavoritePath(oldPath, newPath, folderRenameValue.trim());
      const state = useAppStore.getState();
      // 즐겨찾기 파일 경로 업데이트 (해당 폴더 안 파일들)
      state.favoriteFiles.forEach((fp) => {
        if (fp.startsWith(oldPath + "\\")) {
          state.removeFavoriteFile(fp);
          state.addFavoriteFile(fp.replace(oldPath, newPath));
        }
      });
      refreshFileTree();
    } catch (err) {
      console.error("폴더 이름 변경 실패:", err);
    }
    setFolderRenaming(null);
  };

  const toggleFav = async (path: string) => {
    // 클릭 시 유효성 체크
    try {
      const valid = await exists(path);
      if (!valid) {
        setBrokenPaths((prev) => new Set([...prev, path]));
        setExpandedFavs((prev) => { const n = new Set(prev); n.delete(path); return n; });
        return;
      }
      setBrokenPaths((prev) => { const n = new Set(prev); n.delete(path); return n; });
    } catch {
      setBrokenPaths((prev) => new Set([...prev, path]));
      return;
    }
    setExpandedFavs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, path });
  };

  const handleRelink = async (oldPath: string) => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") {
      const name = selected.split("\\").pop() ?? selected;
      removeFavorite(oldPath);
      addFavorite({ path: selected, name });
    }
  };

  const handleNewFile = async (folderPath: string) => {
    try {
      let name = "제목 없음.md";
      let i = 1;
      while (await exists(`${folderPath}\\${name}`)) {
        name = `제목 없음 ${i}.md`;
        i++;
      }
      const filePath = `${folderPath}\\${name}`;
      const content = "";
      await mkdir(folderPath, { recursive: true }).catch(() => {});
      const file = await create(filePath);
      await file.write(new TextEncoder().encode(content));
      await file.close();
      setExpandedFavs((prev) => new Set([...prev, folderPath]));
      refreshFileTree();
      openTab(filePath, name, content);
    } catch (err) {
      console.error("새 문서 생성 실패:", err);
    }
  };

  const handleNewFolder = async (folderPath: string) => {
    try {
      let name = "새 폴더";
      let i = 1;
      while (await exists(`${folderPath}\\${name}`)) {
        name = `새 폴더 ${i}`;
        i++;
      }
      await mkdir(`${folderPath}\\${name}`);
      setExpandedFavs((prev) => new Set([...prev, folderPath]));
      refreshFileTree();
    } catch (err) {
      console.error("새 폴더 생성 실패:", err);
    }
  };

  const handleAddFolder = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") {
      const name = selected.split("\\").pop() ?? selected;
      const exists = favorites.some((f) => f.path === selected);
      if (!exists) addFavorite({ path: selected, name });
    }
  };

  const handleSidebarContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-fav-item]")) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const getContextMenuItems = (path: string): ContextMenuItem[] => {
    const isBroken = brokenPaths.has(path);
    if (isBroken) {
      return [
        { label: "경로 다시 지정...", onClick: () => handleRelink(path) },
        { divider: true, label: "", onClick: () => {} },
        { label: "즐겨찾기에서 제거", onClick: () => removeFavorite(path), danger: true },
      ];
    }
    const fav = favorites.find((f) => f.path === path);
    const hasAlias = !!fav?.alias;
    return [
      { label: "새 문서", onClick: () => handleNewFile(path) },
      { label: "새 폴더", onClick: () => handleNewFolder(path) },
      { divider: true, label: "", onClick: () => {} },
      { label: hasAlias ? "별칭 변경" : "별칭 만들기", onClick: () => {
        setAliasEditing(path);
        setAliasValue(fav?.alias ?? fav?.name ?? "");
      }},
      ...(hasAlias ? [{ label: "별칭 제거", onClick: () => setFavoriteAlias(path, undefined) }] : []),
      { divider: true, label: "", onClick: () => {} },
      { label: "아이콘 변경", onClick: () => setIconPickerPath(path) },
      { label: "이름 바꾸기", onClick: () => {
        setFolderRenaming(path);
        setFolderRenameValue(path.split("\\").pop() ?? "");
      }},
      { divider: true, label: "", onClick: () => {} },
      { label: "경로 복사", onClick: () => navigator.clipboard.writeText(path) },
      { label: "탐색기에서 열기", onClick: () => { invoke("open_in_explorer", { path }); } },
      { divider: true, label: "", onClick: () => {} },
      { label: "즐겨찾기에서 제거", onClick: () => removeFavorite(path), danger: true },
    ];
  };

  return (
    <div className="flex shrink-0" style={{
      width: sidebarCollapsed ? "0px" : `${sidebarWidth}px`,
      transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    }}>
    <aside
      className="bg-bg-primary flex flex-col overflow-hidden flex-1"
      style={{
        opacity: sidebarCollapsed ? 0 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <>

      <div className="flex-1 overflow-y-auto hide-scrollbar" style={{ padding: "0", fontSize: compactMode ? "11px" : "13px" }} onContextMenu={handleSidebarContextMenu}>


        {/* ── 폴더 섹션 ── */}
        {!searchQuery && (
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 16px", height: "40px",
            borderBottom: "1px solid var(--color-border-light)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Documents
          </span>
        </div>
        )}

        {(searchQuery || true) && (favorites.length === 0 && !searchQuery ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: "24px 0" }}>
            <p style={{ fontSize: "12px", color: "var(--color-text-light)" }}>하단에서 폴더를 추가하세요</p>
          </div>
        ) : (
          <div>
            {[...favorites].map((fav, favIdx) => {
              const isBroken = brokenPaths.has(fav.path);
              const d = dragFav;
              // 드롭선 위치: 이 폴더 아래에 선 표시
              const showBottom = d && d.from !== favIdx && (
                (d.over === favIdx && d.pos === "below") ||
                (d.over === favIdx + 1 && d.pos === "above" && d.from !== favIdx + 1)
              );
              // 맨 위 선: 첫 폴더 위
              const showTop = favIdx === 0 && d && d.over === 0 && d.pos === "above" && d.from !== 0;
              // 애니메이션: 선 위쪽은 올라가고, 선 아래쪽은 내려감
              const pushUp = showBottom;
              const pushDown = showTop || (d && d.from !== favIdx && (
                (d.over === favIdx - 1 && d.pos === "below" && d.from !== favIdx - 1) ||
                (d.over === favIdx && d.pos === "above")
              ));
              return (
                <div key={fav.path}>
                {showTop && <div style={{ height: "4px", background: "var(--color-accent)", margin: "0 16px", borderRadius: "2px" }} />}
                <div
                  data-fav-item
                  onMouseMove={(e) => updateFavDragTarget(e, favIdx)}
                  style={{
                    display: searchQuery && !foldersWithResults.has(fav.path) ? "none" : undefined,
                    borderTop: "2px solid transparent",
                    borderBottom: "2px solid transparent",
                    opacity: d?.from === favIdx ? 0.4 : 1,
                    transform: pushUp ? "translateY(-4px)" : pushDown ? "translateY(4px)" : "translateY(0)",
                    transition: "transform 0.15s ease, opacity 0.15s ease",
                  }}
                >
                  {(
                  <div
                    onMouseDown={(e) => startFavDrag(e, favIdx)}
                    onClick={() => { if (!dragFavState.current.active) toggleFav(fav.path); }}
                    onContextMenu={(e) => handleContextMenu(e, fav.path)}
                    className={`group w-full flex items-center gap-2 font-semibold transition-all duration-[0.15s]`}
                    style={{
                      fontSize: compactMode ? "11px" : "13px",
                      height: compactMode ? "22px" : "30px",
                      padding: "0 16px",
                      color: isBroken ? "var(--color-text-muted)" : "var(--color-text-secondary)",
                      cursor: isBroken ? "default" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!isBroken) e.currentTarget.style.background = "var(--color-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "";
                    }}
                  >
                    {/* 펼침 화살표 */}
                    {!isBroken && (
                      <ChevronRight
                        size={12}
                        className={`shrink-0 transition-transform duration-[0.15s] text-text-light ${expandedFavs.has(fav.path) ? "rotate-90" : ""}`}
                      />
                    )}

                    {/* 폴더 아이콘 */}
                    {(() => {
                      const IconComp = fav.icon ? icons[fav.icon as keyof typeof icons] : Folder;
                      return IconComp ? <IconComp size={14} className="shrink-0" style={{ color: isBroken ? "var(--color-text-muted)" : "var(--color-accent)" }} /> : <Folder size={14} className="shrink-0" style={{ color: "var(--color-accent)" }} />;
                    })()}

                    {/* 폴더 이름 */}
                    {folderRenaming === fav.path ? (
                      <input
                        autoFocus
                        value={folderRenameValue}
                        onChange={(e) => setFolderRenameValue(e.target.value)}
                        onBlur={() => handleFolderRename(fav.path)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleFolderRename(fav.path);
                          if (e.key === "Escape") setFolderRenaming(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: "14px", fontWeight: 600, color: "var(--color-accent)",
                          background: "transparent", border: "none",
                          borderRadius: "0", padding: "0", outline: "none", width: "100%",
                        }}
                      />
                    ) : aliasEditing === fav.path ? (
                      <input
                        autoFocus
                        value={aliasValue}
                        onChange={(e) => setAliasValue(e.target.value)}
                        onBlur={() => {
                          if (aliasValue.trim() && aliasValue.trim() !== fav.name) {
                            setFavoriteAlias(fav.path, aliasValue.trim());
                          }
                          setAliasEditing(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (aliasValue.trim() && aliasValue.trim() !== fav.name) {
                              setFavoriteAlias(fav.path, aliasValue.trim());
                            }
                            setAliasEditing(null);
                          }
                          if (e.key === "Escape") setAliasEditing(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: "14px", fontWeight: 600, color: "var(--color-accent)",
                          background: "transparent", border: "none",
                          borderRadius: "0", padding: "0", outline: "none", width: "100%",
                        }}
                      />
                    ) : (
                      <div className="flex-1 flex items-center gap-1 min-w-0">
                        <span className="truncate">{fav.alias ?? fav.name}</span>
                        {fav.alias && aliasEditing !== fav.path && folderRenaming !== fav.path && (
                          <Tag size={10} className="shrink-0" style={{ color: "var(--color-accent)" }} />
                        )}
                        {docCounts[fav.path] !== undefined && (
                          <span style={{ fontSize: "10px", color: "var(--color-text-light)", fontWeight: 400, flexShrink: 0 }}>
                            ({docCounts[fav.path]})
                          </span>
                        )}
                      </div>
                    )}

                    {/* 끊긴 체인 아이콘 */}
                    {isBroken && (
                      <Unlink size={13} className="shrink-0 ml-auto" style={{ color: "var(--color-text-muted)" }} />
                    )}

                    {/* 우측 액션 아이콘 (호버 시 표시) */}
                    {!isBroken && aliasEditing !== fav.path && (
                      <div className="shrink-0 ml-auto opacity-0 group-hover:opacity-100" style={{ display: "flex", gap: "2px", transition: "opacity 0.1s" }}>
                        <div
                          onClick={(e) => { e.stopPropagation(); invoke("open_in_explorer", { path: fav.path }); }}
                          title="탐색기에서 열기"
                          style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "3px", cursor: "pointer", color: "var(--color-text-light)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; e.currentTarget.style.background = "var(--color-bg-active)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-light)"; e.currentTarget.style.background = "transparent"; }}
                        >
                          <FolderOpen size={13} />
                        </div>
                        <div
                          onClick={(e) => { e.stopPropagation(); handleNewFolder(fav.path); }}
                          title="새 폴더"
                          style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "3px", cursor: "pointer", color: "var(--color-text-light)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; e.currentTarget.style.background = "var(--color-bg-active)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-light)"; e.currentTarget.style.background = "transparent"; }}
                        >
                          <FolderPlus size={13} />
                        </div>
                        <div
                          onClick={(e) => { e.stopPropagation(); handleNewFile(fav.path); }}
                          title="새 문서"
                          style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "3px", cursor: "pointer", color: "var(--color-text-light)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; e.currentTarget.style.background = "var(--color-bg-active)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-light)"; e.currentTarget.style.background = "transparent"; }}
                        >
                          <FilePlus size={13} />
                        </div>
                      </div>
                    )}
                  </div>
                  )}

                  {/* 파일 트리 */}
                  {!isBroken && (searchQuery || expandedFavs.has(fav.path)) && <FileTree rootPath={fav.path} searchQuery={searchQuery} compact={compactMode} />}
                </div>
                {showBottom && <div style={{ height: "4px", background: "var(--color-accent)", margin: "0 16px", borderRadius: "2px" }} />}
                </div>
              );
            })}
          </div>
        ))}

      </div>



      {/* 아이콘 피커 */}
      {iconPickerPath && (
        <IconPicker
          currentIcon={favorites.find((f) => f.path === iconPickerPath)?.icon}
          onSelect={(icon) => setFavoriteIcon(iconPickerPath, icon)}
          onClose={() => setIconPickerPath(null)}
        />
      )}

      {/* 정렬 메뉴 */}
      {sortMenu && (
        <ContextMenu
          x={sortMenu.x}
          y={sortMenu.y}
          items={[
            { label: "즐겨찾기 정렬", header: true, onClick: () => {} },
            { label: `${fileSort === "name" ? "✓  " : "    "}이름순`, onClick: () => setFileSort("name") },
            { label: `${fileSort === "date-added" ? "✓  " : "    "}추가 날짜순`, onClick: () => setFileSort("date-added") },
            { label: `${fileSort === "custom" ? "✓  " : "    "}사용자 지정`, onClick: () => setFileSort("custom") },
            { divider: true, label: "", onClick: () => {} },
            { label: "폴더 내 정렬", header: true, onClick: () => {} },
            { label: `${folderSort === "name" ? "✓  " : "    "}이름순`, onClick: () => { setFolderSort("name"); refreshFileTree(); } },
            { label: `${folderSort === "date-added" ? "✓  " : "    "}추가 날짜순`, onClick: () => { setFolderSort("date-added"); refreshFileTree(); } },
            { label: `${folderSort === "custom" ? "✓  " : "    "}사용자 지정`, onClick: () => { setFolderSort("custom"); refreshFileTree(); } },
          ]}
          onClose={() => setSortMenu(null)}
          anchorBottom
        />
      )}
      </>

      {/* 액션 바 (하단) */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0",
        padding: "0 16px", height: "34px",
        borderTop: "1px solid var(--color-border-light)",
        flexShrink: 0,
      }}>
        <button
          onClick={() => {
            const allExpanded = favorites.every((f) => expandedFavs.has(f.path));
            if (allExpanded) {
              setExpandedFavs(new Set());
            } else {
              setExpandedFavs(new Set(favorites.map((f) => f.path)));
            }
          }}
          title={favorites.every((f) => expandedFavs.has(f.path)) ? "모두 접기" : "모두 펼치기"}
          style={{
            width: "30px", height: "30px",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", background: "transparent", cursor: "pointer",
            color: "var(--color-text-tertiary)", borderRadius: "3px",
            transition: "all 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
        >
          {favorites.every((f) => expandedFavs.has(f.path))
            ? <ChevronsDownUp size={14} />
            : <ChevronsUpDown size={14} />
          }
        </button>

        <button
          onClick={() => setCompactMode(!compactMode)}
          title={compactMode ? "일반 보기" : "컴팩트 보기"}
          style={{
            width: "30px", height: "30px",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", background: "transparent", cursor: "pointer",
            color: compactMode ? "var(--color-accent)" : "var(--color-text-tertiary)", borderRadius: "3px",
            transition: "all 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <ListCollapse size={14} />
        </button>

        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setSortMenu({ x: rect.left, y: rect.top - 4 });
          }}
          title="정렬"
          style={{
            width: "30px", height: "30px",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", background: "transparent", cursor: "pointer",
            color: "var(--color-text-tertiary)", borderRadius: "3px",
            transition: "all 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
        >
          <ArrowUpDown size={14} />
        </button>

        <button
          onClick={handleAddFolder}
          title="폴더 추가"
          style={{
            width: "30px", height: "30px",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", background: "transparent", cursor: "pointer",
            color: "var(--color-text-tertiary)", borderRadius: "3px",
            transition: "all 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
        >
          <FolderPlus size={14} />
        </button>
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.path)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </aside>

    {/* 리사이즈 핸들 */}
    {!sidebarCollapsed && (
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: "1px",
          cursor: "col-resize",
          background: "var(--color-border-light)",
          flexShrink: 0,
          transition: "width 0.1s, background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-accent)"; e.currentTarget.style.width = "3px"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-border-light)"; e.currentTarget.style.width = "1px"; }}
      />
    )}
    </div>
  );
}
