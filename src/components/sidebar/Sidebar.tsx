import { useState, useEffect, useCallback, useRef } from "react";
import { exists, mkdir, create } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/stores/appStore";
import { FileTree } from "./FileTree";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { Tooltip } from "@/components/ui/Tooltip";
import { Unlink, ChevronRight, Folder, Pin, Tag } from "lucide-react";

function shortenPath(path: string): string {
  const userHome = path.match(/^([A-Z]:\\Users\\[^\\]+)/i);
  if (userHome) {
    return path.replace(userHome[1], "~");
  }
  return path;
}

export function Sidebar() {
  const { favorites, sidebarCollapsed, removeFavorite, addFavorite, workspace, setWorkspace, openTab, refreshFileTree, setFavoriteAlias } = useAppStore();
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
              return 0;
            }).map((fav) => {
              const isBroken = brokenPaths.has(fav.path);
              const isWorkspace = fav.path === workspace;
              return (
                <div key={fav.path} data-fav-item>
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
                      <span className="truncate">{fav.alias ?? fav.name}</span>
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

                  {/* 파일 트리 */}
                  {!isBroken && expandedFavs.has(fav.path) && <FileTree rootPath={fav.path} />}
                </div>
              );
            })}
          </div>
        )}
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
          transition: "width 0.1s",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-accent)"; e.currentTarget.style.width = "3px"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-border-light)"; e.currentTarget.style.width = "1px"; }}
      />
    )}
    </div>
  );
}
