import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readDir, readTextFile, stat, exists } from "@tauri-apps/plugin-fs";
import { parseFrontmatter, assignTagColors } from "./utils/frontmatter";
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

  // 앱 시작 시 즐겨찾기 폴더의 .md 파일 태그 + 최근 문서 스캔
  // persist hydration 완료 후 실행
  useEffect(() => {
    async function scanFiles() {
      const { favorites, favoriteFiles, setAllTags, setRecentFiles, setFilePreviews, setFileContents } = useAppStore.getState();
      const tagMap: Record<string, string[]> = {};
      const fileTimes: { path: string; mtime: number }[] = [];
      const previews: Record<string, string> = {};
      const contents: Record<string, string> = {};

      async function collectMdFiles(dirPath: string): Promise<string[]> {
        const paths: string[] = [];
        try {
          const entries = await readDir(dirPath);
          for (const entry of entries) {
            const fullPath = `${dirPath}\\${entry.name}`;
            if (entry.isDirectory) {
              paths.push(...await collectMdFiles(fullPath));
            } else if (/\.(md|markdown)$/i.test(entry.name ?? "")) {
              paths.push(fullPath);
            }
          }
        } catch {}
        return paths;
      }

      const allPaths: string[] = [];
      for (const fav of favorites) {
        allPaths.push(...await collectMdFiles(fav.path));
      }
      for (const fp of favoriteFiles) {
        if (/\.(md|markdown)$/i.test(fp) && !allPaths.includes(fp)) {
          allPaths.push(fp);
        }
      }

      console.log(`[Marknote] 스캔 대상: ${allPaths.length}개 파일, 즐겨찾기 폴더: ${favorites.length}개`);

      for (const filePath of allPaths) {
        try {
          const [content, fileStat] = await Promise.all([
            readTextFile(filePath),
            stat(filePath).catch(() => null),
          ]);
          const fm = parseFrontmatter(content);
          for (const tag of fm.tags) {
            if (!tagMap[tag]) tagMap[tag] = [];
            if (!tagMap[tag].includes(filePath)) tagMap[tag].push(filePath);
          }
          const mtime = fileStat?.mtime?.getTime?.() ?? fileStat?.mtime ?? 0;
          fileTimes.push({ path: filePath, mtime: typeof mtime === "number" ? mtime : 0 });
          // 미리보기: frontmatter 제외 본문 첫 부분
          const bodyLines = fm.body.split("\n").filter((l) => l.trim() && !l.startsWith("#")).slice(0, 2);
          previews[filePath] = bodyLines.join(" ").substring(0, 100);
          contents[filePath] = fm.body;
        } catch {}
      }

      setAllTags(tagMap);
      assignTagColors(Object.keys(tagMap).sort());
      setFilePreviews(previews);
      setFileContents(contents);
      fileTimes.sort((a, b) => b.mtime - a.mtime);
      setRecentFiles(fileTimes.slice(0, 50).map((f) => f.path));

      console.log(`[Marknote] 태그 ${Object.keys(tagMap).length}개, 최근 파일 ${fileTimes.length}개 로드 완료`);
    }

    async function restoreTabs() {
      const state = useAppStore.getState();
      const tabs = state.tabs;
      const restoredTabs = [];

      for (const tab of tabs) {
        if (tab.type === "tag-explorer") {
          restoredTabs.push(tab);
          continue;
        }
        if (!tab.filePath) continue;
        try {
          const fileExists = await exists(tab.filePath);
          if (fileExists) {
            const content = await readTextFile(tab.filePath);
            restoredTabs.push({ ...tab, content, isDirty: false });
          }
          // 파일이 없으면 탭 제거 (push 안 함)
        } catch {
          // 읽기 실패 시 탭 제거
        }
      }

      // 태그 탐색 탭이 없으면 추가
      if (!restoredTabs.find((t) => t.type === "tag-explorer")) {
        restoredTabs.unshift({ id: "tag-explorer", title: "태그", filePath: null, content: "", isDirty: false, type: "tag-explorer" as const, tagFilters: [] });
      }

      // activeTabId 검증
      const activeTab = restoredTabs.find((t) => t.id === state.activeTabId);
      useAppStore.setState({
        tabs: restoredTabs,
        activeTabId: activeTab ? state.activeTabId : restoredTabs[0]?.id ?? null,
        selectedFile: activeTab?.filePath ?? null,
        fileContent: activeTab?.content ?? "",
      });

      console.log(`[Marknote] 탭 ${restoredTabs.length}개 복원 완료`);
    }

    const unsub = useAppStore.persist.onFinishHydration(() => {
      restoreTabs();
      scanFiles();
    });
    if (useAppStore.persist.hasHydrated()) {
      restoreTabs();
      scanFiles();
    }
    return unsub;
  }, []);

  // 앱 종료 시 임시 문서 확인
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.onCloseRequested(async (event) => {
      const { tabs } = useAppStore.getState();
      const unsaved = tabs.filter((t) => t.type !== "tag-explorer" && !t.filePath && t.content);
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
