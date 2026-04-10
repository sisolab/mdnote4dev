import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { FileTree } from "./FileTree";

export function Sidebar() {
  const { favorites, sidebarCollapsed } = useAppStore();
  const [expandedFavs, setExpandedFavs] = useState<Set<string>>(
    new Set(favorites.map((f) => f.path))
  );

  const toggleFav = (path: string) => {
    setExpandedFavs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
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
      {/* 즐겨찾기 폴더 목록 */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "8px 16px 16px" }}>
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <p className="text-[12px]">상단 메뉴에서 폴더를 추가하세요</p>
          </div>
        ) : (
          <div className="space-y-1">
            {favorites.map((fav) => (
              <div key={fav.path}>
                {/* 즐겨찾기 폴더 헤더 */}
                <button
                  onClick={() => toggleFav(fav.path)}
                  className="w-full flex items-center gap-2 px-3 text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover-blue rounded-lg transition-all duration-[0.15s]"
                  style={{ height: "34px" }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 16 16"
                    fill="none"
                    className={`shrink-0 transition-transform duration-[0.15s] text-text-light ${expandedFavs.has(fav.path) ? "rotate-90" : ""}`}
                  >
                    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 text-accent">
                    <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1 2h5.5A1.5 1.5 0 0114 6.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  <span className="truncate">{fav.name}</span>
                </button>

                {/* 파일 트리 */}
                {expandedFavs.has(fav.path) && <FileTree rootPath={fav.path} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
