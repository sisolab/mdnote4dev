import { useEffect, useState, useRef } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { readDir, readTextFile, stat, exists } from "@tauri-apps/plugin-fs";
import { parseFrontmatter, assignTagColors } from "./utils/frontmatter";
import { cleanupOrphanedImages } from "./utils/imageUtils";
import { Sidebar } from "./components/sidebar/Sidebar";
import { EditorArea } from "./components/editor/EditorArea";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { useSettingsStore, getAccentColors, SPACING_STYLES } from "./stores/settingsStore";
import { useAppStore } from "./stores/appStore";
import { THEMES } from "./stores/themeData";
import { useUndoStore } from "./stores/undoStore";
import { emptyTrash } from "./utils/trashUtils";
import { useFsWatcher } from "./hooks/useFsWatcher";

function App() {
  const { showSettings, themeMode, accentColor, spacingStyle } = useSettingsStore();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  useFsWatcher();

  // 종료 확인 다이얼로그 ESC 닫기
  useEffect(() => {
    if (!showExitConfirm) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowExitConfirm(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showExitConfirm]);

  // 테마 CSS 변수 적용
  useEffect(() => {
    const root = document.documentElement;
    const isDark = themeMode === "dark" || themeMode === "charcoal";
    const colors = getAccentColors(accentColor, isDark);

    root.style.setProperty("--color-accent", colors.accent);
    root.style.setProperty("--color-accent-hover", colors.accentHover);
    root.style.setProperty("--color-accent-subtle", colors.accentSubtle);

    const theme = THEMES[themeMode] ?? THEMES.light;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [themeMode, accentColor]);

  // 스페이싱 스타일 CSS 변수 적용
  useEffect(() => {
    const root = document.documentElement;
    const style = SPACING_STYLES[spacingStyle]?.values ?? SPACING_STYLES.default.values;
    root.style.setProperty("--style-h1-mt", style.h1Mt);
    root.style.setProperty("--style-h1-mb", style.h1Mb);
    root.style.setProperty("--style-h2-mt", style.h2Mt);
    root.style.setProperty("--style-h2-mb", style.h2Mb);
    root.style.setProperty("--style-h3-mt", style.h3Mt);
    root.style.setProperty("--style-h3-mb", style.h3Mb);
    root.style.setProperty("--style-h4-mt", style.h4Mt);
    root.style.setProperty("--style-h4-mb", style.h4Mb);
    root.style.setProperty("--style-p", style.p);
    root.style.setProperty("--style-li", style.li);
    root.style.setProperty("--style-pre", style.pre);
    root.style.setProperty("--style-bq", style.bq);
    root.style.setProperty("--style-hr", style.hr);
  }, [spacingStyle]);

  // 동적 최소 창 크기: 사이드바 폭 + 에디터 고정폭 + 여백
  const { sidebarCollapsed, sidebarWidth } = useAppStore();
  const editorMaxWidth = useSettingsStore((s) => s.settings.editorMaxWidth);
  const widthMode = useSettingsStore((s) => s.settings.widthMode);
  const prevCollapsed = useRef(sidebarCollapsed);
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const sidebar = sidebarCollapsed ? 0 : sidebarWidth;
    const editorMin = widthMode === "fixed" ? editorMaxWidth + 140 : 400;
    const minW = Math.max(720, sidebar + editorMin);
    appWindow.setMinSize(new LogicalSize(minW, 500));
    // 사이드바 토글 시 창 크기 조절
    const collapseChanged = prevCollapsed.current !== sidebarCollapsed;
    prevCollapsed.current = sidebarCollapsed;
    (async () => {
      const factor = await appWindow.scaleFactor();
      const size = await appWindow.innerSize();
      const startW = size.width / factor;
      const height = size.height / factor;
      let targetW = startW;
      if (collapseChanged) {
        // 접기: 사이드바 폭만큼 줄임, 펼치기: 사이드바 폭만큼 늘림
        targetW = sidebarCollapsed ? startW - sidebarWidth : startW + sidebarWidth;
      }
      // 최소 크기 보장
      targetW = Math.max(minW, targetW);
      if (Math.abs(targetW - startW) > 1) {
        const duration = 250;
        const startTime = performance.now();
        const animate = (now: number) => {
          const progress = Math.min((now - startTime) / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          const w = startW + (targetW - startW) * ease;
          appWindow.setSize(new LogicalSize(Math.round(w), height));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    })();
  }, [sidebarCollapsed, sidebarWidth, editorMaxWidth, widthMode]);

  // 앱 시작 시 즐겨찾기 폴더의 .md 파일 태그 + 최근 문서 스캔
  // persist hydration 완료 후 실행
  useEffect(() => {
    async function scanFiles() {
      const { favorites, favoriteFiles, setAllTags, setRecentFiles, setFilePreviews, setFileContents, setAllAttachments } = useAppStore.getState();
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

      // 첨부파일 스캔
      const attachments: import("@/stores/appStore").AttachmentInfo[] = [];
      const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|svg)$/i;
      for (const filePath of allPaths) {
        const body = contents[filePath] ?? "";
        const linkRegex = /\[([^\]]+)\]\((\.\/\.assets\/([^)]+))\)/g;
        let m;
        while ((m = linkRegex.exec(body)) !== null) {
          const [, , relativePath, filename] = m;
          if (IMAGE_EXTS.test(filename)) continue;
          const docDir = filePath.substring(0, filePath.lastIndexOf("\\"));
          const absPath = `${docDir}\\${relativePath.substring(2).replace(/\//g, "\\")}`;
          const ext = filename.includes(".") ? filename.substring(filename.lastIndexOf(".") + 1).toLowerCase() : "";
          let size = 0, mtime = 0;
          try {
            const s = await stat(absPath);
            size = s.size;
            mtime = s.mtime?.getTime?.() ?? (typeof s.mtime === "number" ? s.mtime : 0);
          } catch {}
          attachments.push({ filename, absPath, relativePath, docPath: filePath, size, mtime, ext });
        }
      }
      setAllAttachments(attachments);

    }

    async function restoreTabs() {
      const state = useAppStore.getState();
      const tabs = state.tabs;
      const restoredTabs = [];

      for (const tab of tabs) {
        if (tab.type === "tag-explorer" || tab.type === "attachment-explorer" || tab.type === "tab-explorer") {
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

      // 고정 탭이 없으면 추가
      if (!restoredTabs.find((t) => t.type === "tag-explorer")) {
        restoredTabs.unshift({ id: "tag-explorer", title: "검색", filePath: null, content: "", isDirty: false, type: "tag-explorer" as const, tagFilters: [] });
      }
      if (!restoredTabs.find((t) => t.type === "attachment-explorer")) {
        const tagIdx = restoredTabs.findIndex((t) => t.type === "tag-explorer");
        restoredTabs.splice(tagIdx + 1, 0, { id: "attachment-explorer", title: "첨부파일", filePath: null, content: "", isDirty: false, type: "attachment-explorer" as const });
      }
      if (!restoredTabs.find((t) => t.type === "tab-explorer")) {
        const attIdx = restoredTabs.findIndex((t) => t.type === "attachment-explorer");
        restoredTabs.splice(attIdx + 1, 0, { id: "tab-explorer", title: "열린 탭", filePath: null, content: "", isDirty: false, type: "tab-explorer" as const });
      }

      // activeTabId 검증
      const activeTab = restoredTabs.find((t) => t.id === state.activeTabId);
      useAppStore.setState({
        tabs: restoredTabs,
        activeTabId: activeTab ? state.activeTabId : restoredTabs[0]?.id ?? null,
        selectedFile: activeTab?.filePath ?? null,
        fileContent: activeTab?.content ?? "",
      });

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
      event.preventDefault();
      const { tabs } = useAppStore.getState();

      // 미저장 문서 확인 (임시 문서 + isDirty 문서)
      const unsaved = tabs.filter((t) =>
        t.type !== "tag-explorer" && t.type !== "attachment-explorer" &&
        (t.isDirty || (!t.filePath && t.content))
      );
      if (unsaved.length > 0) {
        setShowExitConfirm(true);
        return;
      }

      // 열린 탭의 고아 이미지 정리
      for (const tab of tabs) {
        if (tab.filePath) {
          await cleanupOrphanedImages(tab.filePath, tab.content ?? "").catch(() => {});
        }
      }

      // .trash 폴더 비우기
      const { favorites } = useAppStore.getState();
      for (const fav of favorites) {
        await emptyTrash(fav.path).catch(() => {});
      }

      // undo 히스토리 초기화
      useUndoStore.getState().clear();

      // 정리 완료 후 종료
      await appWindow.destroy();
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

  // 글로벌 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      const key = e.key.toLowerCase();
      const store = useAppStore.getState();

      // Ctrl+Z / Ctrl+Shift+Z — 사이드바 undo/redo (에디터 외부)
      if (key === "z" && !document.activeElement?.closest(".tiptap")) {
        e.preventDefault();
        if (e.shiftKey) useUndoStore.getState().redo();
        else useUndoStore.getState().undo();
        return;
      }

      // Ctrl+W — 현재 탭 닫기 (isDirty 경고는 TabBar가 처리)
      if (key === "w") {
        e.preventDefault();
        if (store.activeTabId) {
          const tab = store.tabs.find((t) => t.id === store.activeTabId);
          if (tab && tab.type !== "tag-explorer" && tab.type !== "attachment-explorer" && tab.type !== "tab-explorer" && !tab.pinned) {
            const saveMode = useSettingsStore.getState().saveMode;
            if (tab.isDirty && tab.filePath && (saveMode === "on-tab-close" || saveMode === "realtime")) {
              // 자동 저장 후 닫기
              window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }));
              const onSaved = () => { store.closeTab(tab.id); window.removeEventListener("manual-save", onSaved); };
              window.addEventListener("manual-save", onSaved);
            } else if ((tab.isDirty && tab.filePath) || (!tab.filePath && tab.content)) {
              window.dispatchEvent(new CustomEvent("request-close-tab", { detail: tab.id }));
            } else {
              store.closeTab(store.activeTabId);
            }
          }
        }
        return;
      }

      // Ctrl+N — 새 탭
      if (key === "n") {
        e.preventDefault();
        store.newTab();
        return;
      }

      // Ctrl+Shift+F — 검색 탭
      if (key === "f" && e.shiftKey) {
        e.preventDefault();
        store.openTagExplorer();
        return;
      }

      // Ctrl+Shift+A — 첨부파일 탭
      if (key === "a" && e.shiftKey) {
        e.preventDefault();
        store.openAttachmentExplorer();
        return;
      }

      // Ctrl+Tab / Ctrl+Shift+Tab — 탭 전환
      if (e.key === "Tab") {
        e.preventDefault();
        const { tabs, activeTabId, setActiveTab } = store;
        if (tabs.length <= 1) return;
        const idx = tabs.findIndex((t) => t.id === activeTabId);
        if (e.shiftKey) {
          const prev = (idx - 1 + tabs.length) % tabs.length;
          setActiveTab(tabs[prev].id);
        } else {
          const next = (idx + 1) % tabs.length;
          setActiveTab(tabs[next].id);
        }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
          display: "flex", alignItems: "center", justifyContent: "center",
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
              종료하면 변경 내용이 사라집니다.
            </div>
            <div style={{ marginBottom: "20px", padding: "8px 12px", borderRadius: "6px", background: "var(--color-bg-hover)" }}>
              {useAppStore.getState().tabs.filter((t) =>
                t.type !== "tag-explorer" && t.type !== "attachment-explorer" &&
                (t.isDirty || (!t.filePath && t.content))
              ).map((t) => (
                <div key={t.id} style={{ fontSize: "12px", color: "var(--color-text-primary)", fontStyle: t.filePath ? "normal" : "italic", padding: "2px 0" }}>
                  • {t.title.replace(/\.(md|markdown)$/i, "")}{!t.filePath ? " (임시)" : ""}
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
