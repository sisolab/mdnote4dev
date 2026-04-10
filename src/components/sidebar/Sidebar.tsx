import { useState, useEffect, useCallback } from "react";
import { exists } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/stores/appStore";
import { FileTree } from "./FileTree";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";

export function Sidebar() {
  const { favorites, sidebarCollapsed, removeFavorite, addFavorite } = useAppStore();
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

  useEffect(() => {
    checkFolders();
  }, [checkFolders]);

  const toggleFav = (path: string) => {
    if (brokenPaths.has(path)) return;
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
        { label: "경로 변경...", onClick: () => handleRelink(path) },
        { divider: true, label: "", onClick: () => {} },
        { label: "즐겨찾기에서 제거", onClick: () => removeFavorite(path), danger: true },
      ];
    }
    return [
      { label: "탐색기에서 열기", onClick: () => { invoke("open_in_explorer", { path }); } },
      { divider: true, label: "", onClick: () => {} },
      { label: "즐겨찾기에서 제거", onClick: () => removeFavorite(path), danger: true },
    ];
  };

  return (
    <aside
      className="bg-bg-primary border-r border-border-light flex flex-col shrink-0 overflow-hidden"
      style={{
        width: sidebarCollapsed ? "0px" : "280px",
        minWidth: sidebarCollapsed ? "0px" : "280px",
        borderRightWidth: sidebarCollapsed ? "0px" : "1px",
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-right-width 0.25s",
        opacity: sidebarCollapsed ? 0 : 1,
      }}
    >
      <div className="flex-1 overflow-y-auto" style={{ padding: "8px 16px 16px" }} onContextMenu={handleSidebarContextMenu}>
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <p className="text-[12px]">상단 메뉴에서 폴더를 추가하세요</p>
          </div>
        ) : (
          <div className="space-y-1">
            {favorites.map((fav) => {
              const isBroken = brokenPaths.has(fav.path);
              return (
                <div key={fav.path} data-fav-item>
                  <button
                    onClick={() => toggleFav(fav.path)}
                    onContextMenu={(e) => handleContextMenu(e, fav.path)}
                    className="w-full flex items-center gap-2 px-3 text-[14px] font-semibold rounded-lg transition-all duration-[0.15s]"
                    style={{
                      height: "34px",
                      color: isBroken ? "#bbb" : "#555",
                      cursor: isBroken ? "default" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!isBroken) e.currentTarget.style.background = "#eef1f5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "";
                    }}
                  >
                    {/* 펼침 화살표 */}
                    {!isBroken && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 16 16"
                        fill="none"
                        className={`shrink-0 transition-transform duration-[0.15s] text-text-light ${expandedFavs.has(fav.path) ? "rotate-90" : ""}`}
                      >
                        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}

                    {/* 폴더 아이콘 */}
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0" style={{ color: isBroken ? "#ccc" : "#1a73e8" }}>
                      <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1 2h5.5A1.5 1.5 0 0114 6.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z" stroke="currentColor" strokeWidth="1.2" />
                    </svg>

                    {/* 폴더 이름 */}
                    <span className="truncate">{fav.name}</span>

                    {/* 깨진 링크 아이콘 */}
                    {isBroken && (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0 ml-auto" style={{ color: "#ccc" }}>
                        <path d="M6.5 9.5L3.7 12.3a2 2 0 01-2.8-2.8L3.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        <path d="M9.5 6.5l2.8-2.8a2 2 0 00-2.8-2.8L7 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        <path d="M4 12L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>

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
  );
}
