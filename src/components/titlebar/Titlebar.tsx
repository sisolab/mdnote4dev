import { useAppStore } from "@/stores/appStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";

function MenuButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-2 rounded-md text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all duration-[0.15s]"
      style={{ padding: "4px 8px" }}
    >
      {children}
    </button>
  );
}

export function Titlebar() {
  const { favorites, addFavorite, newTab, openTab, toggleSidebar } = useAppStore();
  const { setShowSettings } = useSettingsStore();

  const handleNewFile = () => {
    newTab();
  };

  const handleOpenFile = async () => {
    const path = await open({
      filters: [{ name: "Markdown", extensions: ["md"] }],
      multiple: false,
    });
    if (path && typeof path === "string") {
      const content = await readTextFile(path);
      const name = path.split("\\").pop() ?? "문서";
      openTab(path, name, content);
    }
  };

  const handleOpenFolder = async () => {
    const path = await open({ directory: true, multiple: false });
    if (path && typeof path === "string") {
      const name = path.split("\\").pop() ?? path;
      const exists = favorites.some((f) => f.path === path);
      if (!exists) addFavorite({ path, name });
    }
  };

  const handleSave = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }));
  };

  return (
    <div className="flex items-center justify-between bg-bg-frosted border-b border-border-light shrink-0 backdrop-blur-[8px]" style={{ height: "40px", padding: "0 10px" }}>
      {/* 왼쪽: 앱 이름 + 메뉴 */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleSidebar}
          title="사이드바 토글"
          style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#888", transition: "all 0.1s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f1f3"; e.currentTarget.style.color = "#555"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#888"; }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5.5 2.5v11" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#222", padding: "0 6px", marginRight: "4px" }}>
          Marknote
        </span>

        <div style={{ width: "1px", height: "16px", background: "#eee", margin: "0 4px" }} />

        <MenuButton onClick={handleNewFile} title="새 문서 (Ctrl+N)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
            <path d="M9 2H4.5A1.5 1.5 0 003 3.5v9A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V6L9 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 6v4M6 8h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span>새 문서</span>
        </MenuButton>

        <MenuButton onClick={handleOpenFile} title="파일 열기 (Ctrl+O)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
            <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1 2h5.5A1.5 1.5 0 0114 6.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span>열기</span>
        </MenuButton>

        <MenuButton onClick={handleOpenFolder} title="폴더 추가">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
            <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1 2h5.5A1.5 1.5 0 0114 6.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 7v4M6 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span>폴더</span>
        </MenuButton>

        <MenuButton onClick={handleSave} title="저장 (Ctrl+S)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
            <path d="M12.5 14h-9A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2H11l3 3v7.5a1.5 1.5 0 01-1.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 14v-4h6v4M5 2v3h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>저장</span>
        </MenuButton>
      </div>

      {/* 오른쪽: 설정 */}
      <div className="flex items-center">
        <button
          onClick={() => setShowSettings(true)}
          title="에디터 설정"
          style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#888", transition: "all 0.1s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f1f3"; e.currentTarget.style.color = "#555"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#888"; }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
            <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M13.5 8a5.5 5.5 0 01-.15 1.2l1.24.72-.75 1.3-1.24-.72A5.5 5.5 0 0111 11.85v1.44h-1.5v-1.44a5.5 5.5 0 01-1.6-1.35l-1.24.72-.75-1.3 1.24-.72A5.5 5.5 0 017 8c0-.42.05-.82.15-1.2L5.91 6.08l.75-1.3 1.24.72A5.5 5.5 0 019.5 4.15V2.71H11v1.44a5.5 5.5 0 011.6 1.35l1.24-.72.75 1.3-1.24.72c.1.38.15.78.15 1.2z" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
