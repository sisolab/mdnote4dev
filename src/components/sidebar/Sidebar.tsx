import { useState, useEffect, useCallback, useRef } from "react";
import { exists, mkdir, create, readDir, rename, stat } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/stores/appStore";
import { FileTree } from "./FileTree";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { Unlink, ChevronRight, Folder, Tag, ChevronsDownUp, ChevronsUpDown, ArrowUpDown, FilePlus, FolderPlus, ListCollapse, icons } from "lucide-react";
import { IconPicker } from "@/components/settings/IconPicker";
import { AnimatedCollapse } from "@/components/ui/AnimatedCollapse";
import { executeUndoable } from "@/stores/undoStore";
export function Sidebar() {
  const { favorites, sidebarCollapsed, sidebarWidth, setSidebarWidth, removeFavorite, addFavorite, openTab, refreshFileTree, fileTreeVersion, setFavoriteAlias, updateFavoritePath, setFavoriteIcon, folderSort, fileSort, setFolderSort, setFileSort, selectedPaths, reorderFavorites } = useAppStore();
  const [compactMode, setCompactMode] = useState(false);
  const [sortMenu, setSortMenu] = useState<{ x: number; y: number } | null>(null);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [aliasEditing, setAliasEditing] = useState<string | null>(null);
  const [aliasValue, setAliasValue] = useState("");
  const [folderRenaming, setFolderRenaming] = useState<string | null>(null);
  const [folderRenameValue, setFolderRenameValue] = useState("");
  // ── 최상위 폴더 드래그 순서 변경 ──
  const [dragFavFrom, setDragFavFrom] = useState<number | null>(null);
  const dragFavState = useRef<{ startY: number; from: number; to: number; pos: "above" | "below"; active: boolean }>({ startY: 0, from: -1, to: -1, pos: "below", active: false });
  const favFlipPositions = useRef<Record<string, number>>({});
  const [flipAnimating, setFlipAnimating] = useState(false);

  const favGhostRef = useRef<HTMLDivElement | null>(null);

  const startFavDrag = (e: React.MouseEvent, idx: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startY = e.clientY;
    const favPath = favorites[idx]?.path;
    dragFavState.current = { startY, from: idx, to: -1, pos: "below", active: false };

    const onMove = (me: MouseEvent) => {
      me.preventDefault();
      const s = dragFavState.current;
      if (!s.active && Math.abs(me.clientY - s.startY) > 5) {
        s.active = true;
        setDragFavFrom(idx);
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
        document.body.setAttribute("data-dragging", "true");
        // 고스트 생성
        const srcEl = document.querySelector(`[data-fav-path="${CSS.escape(favPath)}"] [data-path]`) as HTMLElement | null;
        if (srcEl) {
          const ghost = document.createElement("div");
          const clone = srcEl.cloneNode(true) as HTMLElement;
          clone.style.position = "static";
          clone.style.background = "var(--color-bg-elevated)";
          clone.style.border = "1px solid var(--color-border-medium)";
          clone.style.borderRadius = "4px";
          clone.style.width = `${srcEl.offsetWidth}px`;
          ghost.appendChild(clone);
          ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;opacity:0.75;box-shadow:0 4px 16px rgba(0,0,0,0.2);border-radius:4px;left:${me.clientX + 8}px;top:${me.clientY - 4}px;`;
          document.body.appendChild(ghost);
          favGhostRef.current = ghost;
        }
      }
      // 고스트 이동
      if (favGhostRef.current) {
        favGhostRef.current.style.left = `${me.clientX + 8}px`;
        favGhostRef.current.style.top = `${me.clientY - 4}px`;
      }
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.body.removeAttribute("data-dragging");
      // 고스트 페이드아웃
      if (favGhostRef.current) {
        const g = favGhostRef.current;
        g.style.transition = "opacity 0.3s ease";
        g.style.opacity = "0";
        setTimeout(() => { g.remove(); }, 300);
        favGhostRef.current = null;
      }
      const s = dragFavState.current;
      if (s.active && s.to >= 0 && s.from !== s.to) {
        const rawInsert = s.pos === "above" ? s.to : s.to + 1;
        const insertAt = rawInsert > s.from ? rawInsert - 1 : rawInsert;
        if (insertAt !== s.from) {
          const f = s.from, t = insertAt;
          // FLIP: 위치 캡처
          const positions: Record<string, number> = {};
          document.querySelectorAll("[data-fav-path]").forEach((el) => {
            const path = (el as HTMLElement).dataset.favPath!;
            positions[path] = el.getBoundingClientRect().top;
          });
          favFlipPositions.current = positions;
          setFlipAnimating(true);
          // reorder 실행
          executeUndoable({
            type: "reorder-favorites",
            description: "즐겨찾기 폴더 순서 변경",
            execute: async () => reorderFavorites(f, t),
            undo: async () => reorderFavorites(t, f),
          });
        }
      }
      dragFavState.current = { startY: 0, from: -1, to: -1, pos: "below", active: false };
      setDragFavFrom(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // FLIP 애니메이션: reorder 후 위치 차이만큼 역변환 → 0으로 전환
  useEffect(() => {
    if (!flipAnimating) return;
    const oldPositions = favFlipPositions.current;
    const els = document.querySelectorAll("[data-fav-path]");
    els.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const path = htmlEl.dataset.favPath!;
      const oldTop = oldPositions[path];
      if (oldTop === undefined) return;
      const newTop = htmlEl.getBoundingClientRect().top;
      const delta = oldTop - newTop;
      if (Math.abs(delta) < 1) return;
      htmlEl.style.transform = `translateY(${delta}px)`;
      htmlEl.style.transition = "none";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const dur = Math.min(1.0, Math.max(0.3, Math.abs(delta) * 0.006));
          htmlEl.style.transition = `transform ${dur}s cubic-bezier(0.25, 0.1, 0.25, 1)`;
          htmlEl.style.transform = "translateY(0)";
          setTimeout(() => {
            htmlEl.style.transition = "";
            htmlEl.style.transform = "";
          }, dur * 1000 + 20);
        });
      });
    });
    setFlipAnimating(false);
    favFlipPositions.current = {};
  }, [flipAnimating, favorites]);

  const updateFavDragTarget = (e: React.MouseEvent, favIdx: number) => {
    if (!dragFavState.current.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? "above" : "below";
    dragFavState.current.to = favIdx;
    dragFavState.current.pos = pos;
    // updateFavDragTarget — ref에만 저장, 리렌더 불필요
  };
  const [iconPickerPath, setIconPickerPath] = useState<string | null>(null);
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
        const entries = await readDir(path);
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
    // 루트 폴더 선택 → 하위 항목 하이라이트용
    useAppStore.getState().setSelectedPaths(new Set([path]));
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
        { label: "등록 해제하기", onClick: () => removeFavorite(path), danger: true },
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
      { label: "등록 해제하기", onClick: () => removeFavorite(path), danger: true },
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
        {(
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

        {(favorites.length === 0 ? (
          <div style={{ padding: "24px 0" }} />
        ) : (
          <div>
            {[...favorites].map((fav, favIdx) => {
              const isBroken = brokenPaths.has(fav.path);
              const isDragged = dragFavFrom === favIdx;
              return (
                <div key={fav.path}>
                {favIdx > 0 && (
                  <div style={{ height: "1px", background: "var(--color-border-light)", margin: "6px 16px" }} />
                )}
                <div
                  data-fav-item
                  data-fav-path={fav.path}
                  onMouseMove={(e) => updateFavDragTarget(e, favIdx)}
                  style={{
                    opacity: isDragged ? 0.4 : 1,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  {(
                  <div
                    data-path={fav.path}
                    data-is-dir="true"
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
                      background: selectedPaths.has(fav.path) ? "var(--color-accent-subtle)" : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!isBroken && !dragFavState.current.active) e.currentTarget.style.background = "var(--color-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = selectedPaths.has(fav.path) ? "var(--color-accent-subtle)" : "";
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
                  {!isBroken && (
                    <AnimatedCollapse open={expandedFavs.has(fav.path)}>
                      <FileTree rootPath={fav.path} compact={compactMode} />
                    </AnimatedCollapse>
                  )}
                </div>
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
            { label: `${folderSort === "date-modified" ? "✓  " : "    "}수정 날짜순`, onClick: () => { setFolderSort("date-modified"); refreshFileTree(); } },
            { label: `${folderSort === "custom" ? "✓  " : "    "}사용자 지정`, onClick: async () => {
              if (folderSort !== "custom") {
                // 현재 정렬 결과를 customFileOrder에 스냅샷
                const { setCustomFileOrder } = useAppStore.getState();
                const snapshot = async (dirPath: string) => {
                  try {
                    const entries = await readDir(dirPath);
                    let items = entries
                      .map((e) => ({ name: e.name ?? "", path: `${dirPath}\\${e.name}`, isDir: e.isDirectory }))
                      .filter((e) => e.name && !e.name.startsWith("."));
                    if (folderSort === "date-modified") {
                      const mtimes = new Map<string, number>();
                      await Promise.all(items.map(async (e) => {
                        try { const s = await stat(e.path); mtimes.set(e.path, s.mtime ? new Date(s.mtime).getTime() : 0); } catch { mtimes.set(e.path, 0); }
                      }));
                      items.sort((a, b) => {
                        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
                        return (mtimes.get(b.path) ?? 0) - (mtimes.get(a.path) ?? 0);
                      });
                    } else {
                      items.sort((a, b) => {
                        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
                        return a.name.localeCompare(b.name);
                      });
                    }
                    setCustomFileOrder(dirPath, items.map((e) => e.name));
                  } catch { /* skip broken dirs */ }
                };
                const { expandedFolders } = useAppStore.getState();
                const dirs = [...favorites.map((f) => f.path), ...expandedFolders];
                const unique = [...new Set(dirs)];
                await Promise.all(unique.map((d) => snapshot(d)));
              }
              setFolderSort("custom"); refreshFileTree();
            } },
          ]}
          onClose={() => setSortMenu(null)}
          anchorBottom
        />
      )}
      </>

      {/* 액션 바 (하단) */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0",
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
