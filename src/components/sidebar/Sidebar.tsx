import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "@/stores/appStore";
import { FileTree } from "./FileTree";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { favorites, addFavorite, removeFavorite } = useAppStore();
  const [expandedFavs, setExpandedFavs] = useState<Set<string>>(
    new Set(favorites.map((f) => f.path))
  );

  const handleAddFolder = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") {
      const name = selected.split("\\").pop() ?? selected;
      addFavorite({ path: selected, name });
      setExpandedFavs((prev) => new Set([...prev, selected]));
    }
  };

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
      className={`${
        collapsed ? "w-12" : "w-64"
      } bg-bg-sidebar border-r border-border-light flex flex-col shrink-0 transition-all duration-200`}
    >
      {/* 사이드바 헤더 */}
      <div className="flex items-center justify-between px-3 py-2.5">
        {!collapsed && (
          <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            즐겨찾기
          </span>
        )}
        <div className="flex items-center gap-1">
          {!collapsed && (
            <button
              onClick={handleAddFolder}
              className="p-1.5 rounded-md hover:bg-bg-hover text-text-tertiary hover:text-text-secondary transition-colors"
              title="폴더 추가"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-bg-hover text-text-tertiary hover:text-text-secondary transition-colors"
            title={collapsed ? "사이드바 열기" : "사이드바 닫기"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
            >
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 즐겨찾기 폴더 목록 */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
              <p className="text-sm">폴더를 추가하세요</p>
              <button
                onClick={handleAddFolder}
                className="mt-3 px-4 py-2 text-sm bg-bg-elevated rounded-lg shadow-md hover:shadow-lg text-text-secondary hover:text-text-primary transition-all duration-150 border border-border-light"
              >
                + 폴더 추가
              </button>
            </div>
          ) : (
            favorites.map((fav) => (
              <div key={fav.path}>
                {/* 즐겨찾기 폴더 헤더 */}
                <div className="flex items-center group">
                  <button
                    onClick={() => toggleFav(fav.path)}
                    className="flex-1 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      className={`shrink-0 transition-transform ${expandedFavs.has(fav.path) ? "rotate-90" : ""}`}
                    >
                      <path
                        d="M6 4L10 8L6 12"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        d="M2 4.5A1.5 1.5 0 013.5 3H6l1 2h5.5A1.5 1.5 0 0114 6.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                    </svg>
                    <span className="truncate">{fav.name}</span>
                  </button>
                  <button
                    onClick={() => removeFavorite(fav.path)}
                    className="hidden group-hover:flex p-1 mr-2 rounded hover:bg-bg-active text-text-tertiary hover:text-text-secondary"
                    title="즐겨찾기 해제"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4 4L12 12M12 4L4 12"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                {/* 파일 트리 */}
                {expandedFavs.has(fav.path) && (
                  <FileTree rootPath={fav.path} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
