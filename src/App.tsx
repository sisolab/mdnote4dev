import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { Sidebar } from "./components/sidebar/Sidebar";
import { EditorArea } from "./components/editor/EditorArea";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { useSettingsStore, getAccentColors } from "./stores/settingsStore";
import { useAppStore } from "./stores/appStore";

function App() {
  const { showSettings, themeMode, accentColor } = useSettingsStore();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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
      newspaper: {
        "--color-bg-primary": "#f5f0e8",
        "--color-bg-secondary": "#ede7dd",
        "--color-bg-sidebar": "#ede7dd",
        "--color-bg-hover": "#e5ded3",
        "--color-bg-hover-blue": "#e2dbd0",
        "--color-bg-active": "#d9d1c5",
        "--color-bg-elevated": "#f5f0e8",
        "--color-bg-frosted": "rgba(245, 240, 232, 0.95)",
        "--color-text-heading": "#1a1611",
        "--color-text-primary": "#2d2821",
        "--color-text-secondary": "#5c5347",
        "--color-text-tertiary": "#8a7e70",
        "--color-text-light": "#a69888",
        "--color-text-muted": "#bfb1a0",
        "--color-border-light": "#ddd5c9",
        "--color-border-medium": "#ccc3b5",
        "--color-border-input": "#c2b8a9",
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

  // 앱 종료 시 임시 문서 확인
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.onCloseRequested(async (event) => {
      const { tabs } = useAppStore.getState();
      const unsaved = tabs.filter((t) => !t.filePath && t.content);
      if (unsaved.length > 0) {
        event.preventDefault();
        setShowExitConfirm(true);
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // 파일 드래그앤드롭으로 탭 열기
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.onDragDropEvent(async (event) => {
      if (event.payload.type === "drop") {
        const paths = event.payload.paths;
        for (const path of paths) {
          if (/\.(md|markdown)$/i.test(path)) {
            try {
              const content = await readTextFile(path);
              const name = path.split("\\").pop() ?? "문서";
              useAppStore.getState().openTab(path, name, content);
            } catch (err) {
              console.error("파일 열기 실패:", err);
            }
          }
        }
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const handleForceClose = () => {
    getCurrentWindow().destroy();
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <EditorArea />
      </div>
      {showSettings && <SettingsPanel />}


      {/* 종료 확인 */}
      {showExitConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          display: "flex", alignItems: "start", justifyContent: "center", paddingTop: "120px",
          background: "rgba(0,0,0,0.35)", animation: "fadeIn 0.15s ease-out",
        }}>
          <div style={{
            width: "380px", background: "var(--color-bg-elevated)", borderRadius: "12px",
            border: "1px solid var(--color-border-medium)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            padding: "24px", animation: "fadeIn 0.15s ease-out",
          }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-heading)", marginBottom: "8px" }}>
              저장되지 않은 문서가 있습니다
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "12px", lineHeight: 1.6 }}>
              종료하면 아래 임시 문서의 내용이 삭제됩니다.
            </div>
            <div style={{ marginBottom: "20px", padding: "8px 12px", borderRadius: "6px", background: "var(--color-bg-hover)" }}>
              {useAppStore.getState().tabs.filter((t) => !t.filePath && t.content).map((t) => (
                <div key={t.id} style={{ fontSize: "12px", color: "var(--color-text-primary)", fontStyle: "italic", padding: "2px 0" }}>
                  • {t.title.replace(/\.(md|markdown)$/i, "")}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  padding: "6px 16px", fontSize: "12px", fontWeight: 500,
                  background: "var(--color-bg-hover)", color: "var(--color-text-primary)",
                  border: "none", borderRadius: "6px", cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleForceClose}
                style={{
                  padding: "6px 16px", fontSize: "12px", fontWeight: 600,
                  background: "#e53935", color: "#fff",
                  border: "none", borderRadius: "6px", cursor: "pointer",
                }}
              >
                저장하지 않고 종료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
