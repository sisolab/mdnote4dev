import { useCallback } from "react";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "@/stores/appStore";
import { TiptapEditor } from "./TiptapEditor";
import { TabBar } from "./TabBar";

export function EditorArea() {
  const {
    tabs, activeTabId, updateTabContent, markTabClean,
    updateTabFilePath, workspace,
  } = useAppStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleSave = useCallback(async (markdown: string) => {
    if (!activeTab) return;

    let filePath = activeTab.filePath;

    // 임시 문서면 저장 경로 선택
    if (!filePath) {
      const selected = await save({
        defaultPath: workspace ? `${workspace}\\${activeTab.title}` : undefined,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (!selected) return;
      filePath = selected;
      const fileName = filePath.split("\\").pop() ?? activeTab.title;
      updateTabFilePath(activeTab.id, filePath, fileName);
    }

    try {
      await writeTextFile(filePath, markdown);
      updateTabContent(activeTab.id, markdown);
      markTabClean(activeTab.id);
    } catch (err) {
      console.error("저장 실패:", err);
    }
  }, [activeTab, workspace, updateTabFilePath, updateTabContent, markTabClean]);

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-bg-primary">
      <TabBar />

      {activeTab ? (
        <div className="flex-1 min-h-0">
          <TiptapEditor
            key={activeTab.id}
            content={activeTab.content}
            onSave={handleSave}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div style={{ width: "64px", height: "64px", margin: "0 auto 16px", borderRadius: "16px", background: "#f7f8fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="14,2 14,8 20,8" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <p style={{ fontSize: "13px", color: "#999" }}>
              사이드바에서 문서를 선택하거나 새 문서를 만드세요
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
