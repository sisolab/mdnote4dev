import { useState, useEffect, useCallback, useRef } from "react";
import { SidebarTabs } from "./SidebarTabs";
import { exists, mkdir, create, readDir as tauriReadDir, readTextFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/stores/appStore";
import { FileTree } from "./FileTree";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { Tooltip } from "@/components/ui/Tooltip";
import { Unlink, ChevronRight, Folder, Pin, Tag, Search, ChevronsDownUp, ChevronsUpDown, ArrowUpDown, FilePlus, FolderPlus, FileText } from "lucide-react";

function shortenPath(path: string): string {
  const userHome = path.match(/^([A-Z]:\\Users\\[^\\]+)/i);
  if (userHome) {
    return path.replace(userHome[1], "~");
  }
  return path;
}

export function Sidebar() {
  const { favorites, sidebarCollapsed, removeFavorite, addFavorite, workspace, setWorkspace, openTab, refreshFileTree, fileTreeVersion, setFavoriteAlias, folderSort, fileSort, setFolderSort, setFileSort, standaloneFiles, addStandaloneFile, removeStandaloneFile, selectedPaths } = useAppStore();
  const [sidebarTab, setSidebarTab] = useState("files");
  const [searchQuery, setSearchQuery] = useState("");
  const [standaloneExpanded, setStandaloneExpanded] = useState(true);
  const [foldersWithResults, setFoldersWithResults] = useState<Set<string>>(new Set());
  const [sortMenu, setSortMenu] = useState<{ x: number; y: number } | null>(null);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [aliasEditing, setAliasEditing] = useState<string | null>(null);
  const [aliasValue, setAliasValue] = useState("");
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
      const content = "# " + name.replace(/\.md$/, "") + "\n";
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
    // 폴더 항목 위에서의 우클릭은 무시 (개별 핸들러가 처리)
    if ((e.target as HTMLElement).closest("[data-fav-item]")) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, path: "__sidebar__" });
  };

  const getContextMenuItems = (path: string): ContextMenuItem[] => {
    if (path === "__sidebar__") {
      return [
        { label: "폴더 추가...", onClick: handleAddFolder },
      ];
    }
    if (path === "__standalone_folder__") {
      return [
        { label: "파일 열기...", onClick: async () => {
          const p = await open({ filters: [{ name: "Markdown", extensions: ["md"] }], multiple: false });
          if (p && typeof p === "string") {
            const content = await readTextFile(p);
            const name = p.split("\\").pop() ?? "문서";
            openTab(p, name, content);
            addStandaloneFile(p);
          }
        }},
      ];
    }
    if (path.startsWith("__standalone__")) {
      const filePath = path.replace("__standalone__", "");
      return [
        { label: "탐색기에서 열기", onClick: () => { const dir = filePath.substring(0, filePath.lastIndexOf("\\")); invoke("open_in_explorer", { path: dir }); } },
        { divider: true, label: "", onClick: () => {} },
        { label: "목록에서 제거", onClick: () => removeStandaloneFile(filePath), danger: true },
      ];
    }
    const isBroken = brokenPaths.has(path);
    if (isBroken) {
      return [
        { label: "경로 다시 지정...", onClick: () => handleRelink(path) },
        { divider: true, label: "", onClick: () => {} },
        { label: "즐겨찾기에서 제거", onClick: () => removeFavorite(path), danger: true },
      ];
    }
    const isCurrentWorkspace = path === workspace;
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
      ...(isCurrentWorkspace
        ? [{ label: "기본 폴더 해제", onClick: () => setWorkspace(null) }]
        : [{ label: "기본 폴더로 지정", onClick: () => setWorkspace(path) }]
      ),
      { divider: true, label: "", onClick: () => {} },
      { label: "탐색기에서 열기", onClick: () => { invoke("open_in_explorer", { path }); } },
      { divider: true, label: "", onClick: () => {} },
      { label: "즐겨찾기에서 제거", onClick: () => removeFavorite(path), danger: true },
    ];
  };

  return (
    <div className="flex shrink-0" style={{
      width: sidebarCollapsed ? "0px" : `${sidebarWidth}px`,
      transition: sidebarCollapsed ? "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
    }}>
    <aside
      className="bg-bg-primary flex flex-col overflow-hidden flex-1"
      style={{
        opacity: sidebarCollapsed ? 0 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <SidebarTabs activeTab={sidebarTab} onTabChange={setSidebarTab} />

      {sidebarTab === "files" ? (
      <>
      {/* 검색창 */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "0 16px", height: "36px",
        borderBottom: "1px solid var(--color-border-light)",
      }}>
        <Search size={13} style={{ color: "var(--color-text-light)", flexShrink: 0 }} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="파일 검색"
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            fontSize: "12px", color: "var(--color-text-primary)",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "14px", lineHeight: 1 }}
          >
            ×
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto" style={{ padding: "0" }} onContextMenu={handleSidebarContextMenu}>
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <p className="text-[12px]">상단 메뉴에서 폴더를 추가하세요</p>
          </div>
        ) : (
          <div>
            {[...favorites].sort((a, b) => {
              if (a.path === workspace) return -1;
              if (b.path === workspace) return 1;
              if (folderSort === "name") return (a.alias ?? a.name).localeCompare(b.alias ?? b.name);
              return 0;
            }).map((fav) => {
              const isBroken = brokenPaths.has(fav.path);
              const isWorkspace = fav.path === workspace;
              return (
                <div key={fav.path} data-fav-item style={{ display: searchQuery && !foldersWithResults.has(fav.path) ? "none" : undefined }}>
                  {(
                  <Tooltip text={shortenPath(fav.path)}>
                  <button
                    onClick={() => toggleFav(fav.path)}
                    onContextMenu={(e) => handleContextMenu(e, fav.path)}
                    className="w-full flex items-center gap-2 text-[14px] font-semibold transition-all duration-[0.15s]"
                    style={{
                      height: "36px",
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
                    <Folder size={14} className="shrink-0" style={{ color: isBroken ? "var(--color-text-muted)" : "var(--color-accent)" }} />

                    {/* 폴더 이름 */}
                    {aliasEditing === fav.path ? (
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
                      <>
                      <span className="truncate">{fav.alias ?? fav.name}</span>
                      {docCounts[fav.path] !== undefined && (
                        <span style={{ fontSize: "10px", color: "var(--color-text-light)", fontWeight: 400, marginLeft: "4px", flexShrink: 0 }}>
                          ({docCounts[fav.path]})
                        </span>
                      )}
                      </>
                    )}
                    {/* 별칭 아이콘 */}
                    {fav.alias && aliasEditing !== fav.path && (
                      <Tag size={11} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
                    )}

                    {/* 기본 폴더 고정 아이콘 */}
                    {isWorkspace && (
                      <Pin size={13} className="shrink-0 ml-auto" style={{ color: "var(--color-accent)" }} />
                    )}

                    {/* 끊긴 체인 아이콘 */}
                    {isBroken && (
                      <Unlink size={13} className="shrink-0 ml-auto" style={{ color: "var(--color-text-muted)" }} />
                    )}
                  </button>
                  </Tooltip>
                  )}

                  {/* 파일 트리 */}
                  {!isBroken && (searchQuery || expandedFavs.has(fav.path)) && <FileTree rootPath={fav.path} searchQuery={searchQuery} />}
                </div>
              );
            })}
          </div>
        )}

        {/* 단일 파일 특수 폴더 */}
        {(!searchQuery || standaloneFiles.some((f) => f.split("\\").pop()?.toLowerCase().includes(searchQuery.toLowerCase()))) && (
          <div data-fav-item>
            {!searchQuery && (
            <Tooltip text="개별 파일을 등록할 수 있습니다. 파일의 실제 위치는 바뀌지 않습니다." delay={0}>
            <button
              onClick={() => setStandaloneExpanded(!standaloneExpanded)}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, path: "__standalone_folder__" }); }}
              className="w-full flex items-center gap-2 text-[14px] font-semibold transition-all duration-[0.15s]"
              style={{
                height: "36px",
                padding: "0 16px",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
            >
              <ChevronRight
                size={12}
                className={`shrink-0 transition-transform duration-[0.15s] text-text-light ${standaloneExpanded ? "rotate-90" : ""}`}
              />
              <FileText size={14} className="shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
              <span className="truncate">단일 파일</span>
              <span style={{ fontSize: "10px", color: "var(--color-text-light)", fontWeight: 400, marginLeft: "4px", flexShrink: 0 }}>
                ({standaloneFiles.length})
              </span>
            </button>
            </Tooltip>
            )}

            {(searchQuery || standaloneExpanded) && (
              <div>
                {standaloneFiles
                  .filter((f) => !searchQuery || f.split("\\").pop()?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((filePath) => {
                    const name = filePath.split("\\").pop() ?? "";
                    const { selectedFile, tabs } = useAppStore.getState();
                    const isFocused = selectedFile === filePath;
                    const isOpened = tabs.some((t) => t.filePath === filePath);
                    const isMultiSelected = selectedPaths.has(filePath);
                    return (
                      <button
                        key={filePath}
                        data-path={filePath}
                        onClick={async () => {
                          try {
                            const content = await readTextFile(filePath);
                            openTab(filePath, name, content);
                          } catch {}
                        }}
                        className={`w-full flex items-center gap-2 text-[14px] relative z-10 ${
                          isOpened ? "text-accent font-semibold" : "text-text-primary"
                        }`}
                        style={{
                          paddingLeft: "32px", paddingRight: "16px", height: "36px",
                          background: isMultiSelected ? "var(--color-accent-subtle)" : "transparent",
                        }}
                        onMouseEnter={(e) => { if (!isMultiSelected) e.currentTarget.style.background = "var(--color-bg-hover)"; }}
                        onMouseLeave={(e) => { if (!isMultiSelected) e.currentTarget.style.background = isMultiSelected ? "var(--color-accent-subtle)" : "transparent"; }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({ x: e.clientX, y: e.clientY, path: `__standalone__${filePath}` });
                        }}
                      >
                        <FileText size={13} className="shrink-0 text-text-light" />
                        <span className="truncate">{name}</span>
                        {/* 포커스 인디케이터 */}
                        <div style={{
                          position: "absolute", left: "4px", top: "50%", transform: "translateY(-50%)",
                          width: "2px", height: isFocused ? "16px" : "0px",
                          borderRadius: "1px", background: "var(--color-accent)",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        }} />
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 액션 바 */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0",
        padding: "0 16px", height: "40px",
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
            width: "34px", height: "34px",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", background: "transparent", cursor: "pointer",
            color: "var(--color-text-tertiary)", borderRadius: "3px",
            transition: "all 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
        >
          {favorites.every((f) => expandedFavs.has(f.path))
            ? <ChevronsDownUp size={15} />
            : <ChevronsUpDown size={15} />
          }
        </button>

        <button
          onClick={() => {
            const ws = workspace ?? favorites[0]?.path;
            if (ws) handleNewFile(ws);
          }}
          title="새 문서"
          style={{
            width: "34px", height: "34px",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", background: "transparent", cursor: "pointer",
            color: "var(--color-text-tertiary)", borderRadius: "3px",
            transition: "all 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
        >
          <FilePlus size={15} />
        </button>

        <button
          onClick={handleAddFolder}
          title="폴더 추가"
          style={{
            width: "34px", height: "34px",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", background: "transparent", cursor: "pointer",
            color: "var(--color-text-tertiary)", borderRadius: "3px",
            transition: "all 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
        >
          <FolderPlus size={15} />
        </button>

        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setSortMenu({ x: rect.left, y: rect.top });
          }}
          title="정렬"
          style={{
            width: "34px", height: "34px",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", background: "transparent", cursor: "pointer",
            color: "var(--color-text-tertiary)", borderRadius: "3px",
            transition: "all 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
        >
          <ArrowUpDown size={15} />
        </button>
      </div>

      {/* 정렬 메뉴 */}
      {sortMenu && (
        <ContextMenu
          x={sortMenu.x}
          y={sortMenu.y}
          anchorBottom
          items={[
            { label: "폴더", header: true, onClick: () => {} },
            { label: `${folderSort === "name" ? "✓  " : "    "}이름순`, onClick: () => setFolderSort("name") },
            { label: `${folderSort === "date-added" ? "✓  " : "    "}추가 날짜순`, onClick: () => setFolderSort("date-added") },
            { label: `${folderSort === "custom" ? "✓  " : "    "}사용자 지정`, onClick: () => setFolderSort("custom") },
            { divider: true, label: "", onClick: () => {} },
            { label: "문서", header: true, onClick: () => {} },
            { label: `${fileSort === "name" ? "✓  " : "    "}이름순`, onClick: () => { setFileSort("name"); refreshFileTree(); } },
            { label: `${fileSort === "date-added" ? "✓  " : "    "}추가 날짜순`, onClick: () => { setFileSort("date-added"); refreshFileTree(); } },
            { label: `${fileSort === "custom" ? "✓  " : "    "}사용자 지정`, onClick: () => { setFileSort("custom"); refreshFileTree(); } },
          ]}
          onClose={() => setSortMenu(null)}
        />
      )}
      </>
      ) : (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--color-text-light)", fontSize: "12px" }}>
        태그 기능 준비 중
      </div>
      )}

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
