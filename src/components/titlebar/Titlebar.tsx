import { useAppStore } from "@/stores/appStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Settings, PanelLeft } from "lucide-react";

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
      style={{ padding: "4px 8px", color: "var(--color-text-secondary)" }}
      className="flex items-center gap-2 rounded-md text-[13px] font-medium hover:text-text-primary hover:bg-bg-hover transition-all duration-[0.15s]"
    >
      {children}
    </button>
  );
}

export function Titlebar() {
  const { toggleSidebar } = useAppStore();
  const { setShowSettings } = useSettingsStore();

  return (
    <div style={{ height: "40px", padding: "0 10px", background: "var(--color-bg-frosted)", borderBottom: "1px solid var(--color-border-light)", backdropFilter: "blur(8px)" }} className="flex items-center justify-between shrink-0">
      <div className="flex items-center gap-1">
        <button
          onClick={toggleSidebar}
          title="사이드바 토글"
          style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)", transition: "all 0.1s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
        >
          <PanelLeft size={16} />
        </button>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text-heading)", padding: "0 6px", marginRight: "4px" }}>
          Marknote
        </span>

        <div style={{ width: "1px", height: "16px", background: "var(--color-border-light)", margin: "0 4px" }} />

        <MenuButton onClick={() => setShowSettings(true)} title="에디터 설정">
          <Settings size={14} />
          <span>설정</span>
        </MenuButton>
      </div>
    </div>
  );
}
