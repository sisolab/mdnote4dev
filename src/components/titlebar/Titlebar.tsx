import { useAppStore } from "@/stores/appStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { FilePlus, FolderOpen, FolderPlus, Save, Settings, PanelLeft } from "lucide-react";

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
      <div className="flex items-center gap-1">
        <button
          onClick={toggleSidebar}
          title="사이드바 토글"
          style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#888", transition: "all 0.1s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f1f3"; e.currentTarget.style.color = "#555"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#888"; }}
        >
          <PanelLeft size={16} style={{ opacity: 0.7 }} />
        </button>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#222", padding: "0 6px", marginRight: "4px" }}>
          Marknote
        </span>

        <div style={{ width: "1px", height: "16px", background: "#eee", margin: "0 4px" }} />

        <MenuButton onClick={handleNewFile} title="새 문서 (Ctrl+N)">
          <FilePlus size={14} style={{ opacity: 0.7 }} />
          <span>새 문서</span>
        </MenuButton>

        <MenuButton onClick={handleOpenFile} title="파일 열기 (Ctrl+O)">
          <FolderOpen size={14} style={{ opacity: 0.7 }} />
          <span>열기</span>
        </MenuButton>

        <MenuButton onClick={handleOpenFolder} title="폴더 추가">
          <FolderPlus size={14} style={{ opacity: 0.7 }} />
          <span>폴더</span>
        </MenuButton>

        <MenuButton onClick={handleSave} title="저장 (Ctrl+S)">
          <Save size={14} style={{ opacity: 0.7 }} />
          <span>저장</span>
        </MenuButton>
      </div>

      <div className="flex items-center">
        <button
          onClick={() => setShowSettings(true)}
          title="에디터 설정"
          style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#888", transition: "all 0.1s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f1f3"; e.currentTarget.style.color = "#555"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#888"; }}
        >
          <Settings size={16} style={{ opacity: 0.7 }} />
        </button>
      </div>
    </div>
  );
}
