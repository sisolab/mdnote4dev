import { useEffect } from "react";
import { Sidebar } from "./components/sidebar/Sidebar";
import { EditorArea } from "./components/editor/EditorArea";
import { Titlebar } from "./components/titlebar/Titlebar";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { useSettingsStore, getAccentColors } from "./stores/settingsStore";

function App() {
  const { showSettings, themeMode, accentColor } = useSettingsStore();

  // 테마 CSS 변수 적용
  useEffect(() => {
    const root = document.documentElement;
    const isDark = themeMode === "dark" || themeMode === "charcoal";
    const colors = getAccentColors(accentColor, isDark);

    root.style.setProperty("--color-accent", colors.accent);
    root.style.setProperty("--color-accent-hover", colors.accentHover);
    root.style.setProperty("--color-accent-subtle", colors.accentSubtle);

    const themes: Record<string, Record<string, string>> = {
      light: {
        "--color-bg-primary": "#ffffff",
        "--color-bg-secondary": "#f7f8fa",
        "--color-bg-sidebar": "#f7f8fa",
        "--color-bg-hover": "#f0f1f3",
        "--color-bg-hover-blue": "#eef1f5",
        "--color-bg-active": "#e8e9eb",
        "--color-bg-elevated": "#ffffff",
        "--color-bg-frosted": "rgba(255, 255, 255, 0.95)",
        "--color-text-heading": "#222222",
        "--color-text-primary": "#333333",
        "--color-text-secondary": "#555555",
        "--color-text-tertiary": "#888888",
        "--color-text-light": "#999999",
        "--color-text-muted": "#aaaaaa",
        "--color-border-light": "#eeeeee",
        "--color-border-medium": "#e0e0e0",
        "--color-border-input": "#dddddd",
      },
      warm: {
        "--color-bg-primary": "#faf8f5",
        "--color-bg-secondary": "#f3f0eb",
        "--color-bg-sidebar": "#f3f0eb",
        "--color-bg-hover": "#ece8e1",
        "--color-bg-hover-blue": "#eae6df",
        "--color-bg-active": "#e2ddd5",
        "--color-bg-elevated": "#faf8f5",
        "--color-bg-frosted": "rgba(250, 248, 245, 0.95)",
        "--color-text-heading": "#2c2520",
        "--color-text-primary": "#3d3530",
        "--color-text-secondary": "#6b5f55",
        "--color-text-tertiary": "#9a8e82",
        "--color-text-light": "#b0a498",
        "--color-text-muted": "#c5b9ad",
        "--color-border-light": "#e8e2da",
        "--color-border-medium": "#d8d0c6",
        "--color-border-input": "#cec5ba",
      },
      charcoal: {
        "--color-bg-primary": "#363839",
        "--color-bg-secondary": "#3c3e40",
        "--color-bg-sidebar": "#3c3e40",
        "--color-bg-hover": "#474a4c",
        "--color-bg-hover-blue": "#454850",
        "--color-bg-active": "#515456",
        "--color-bg-elevated": "#3e4042",
        "--color-bg-frosted": "rgba(54, 56, 57, 0.95)",
        "--color-text-heading": "#dcdcdc",
        "--color-text-primary": "#bcbcbc",
        "--color-text-secondary": "#8c8c8c",
        "--color-text-tertiary": "#6c6c6c",
        "--color-text-light": "#585858",
        "--color-text-muted": "#484848",
        "--color-border-light": "#3c3e41",
        "--color-border-medium": "#4a4c4f",
        "--color-border-input": "#555759",
      },
      dark: {
        "--color-bg-primary": "#1e1e1e",
        "--color-bg-secondary": "#252526",
        "--color-bg-sidebar": "#252526",
        "--color-bg-hover": "#2a2d2e",
        "--color-bg-hover-blue": "#2a2d3e",
        "--color-bg-active": "#333333",
        "--color-bg-elevated": "#2d2d2d",
        "--color-bg-frosted": "rgba(30, 30, 30, 0.95)",
        "--color-text-heading": "#e0e0e0",
        "--color-text-primary": "#cccccc",
        "--color-text-secondary": "#999999",
        "--color-text-tertiary": "#666666",
        "--color-text-light": "#555555",
        "--color-text-muted": "#444444",
        "--color-border-light": "#333333",
        "--color-border-medium": "#444444",
        "--color-border-input": "#555555",
      },
    };

    const theme = themes[themeMode] ?? themes.light;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [themeMode, accentColor]);

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <Titlebar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <EditorArea />
      </div>
      {showSettings && <SettingsPanel />}
    </div>
  );
}

export default App;
