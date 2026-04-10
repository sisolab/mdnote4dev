import { useCallback, useEffect } from "react";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "@/stores/appStore";
import { TiptapEditor } from "./TiptapEditor";
import { TabBar } from "./TabBar";
import { FileText } from "lucide-react";

export function EditorArea() {
  const {
    tabs, activeTabId, updateTabContent, markTabClean,
    updateTabFilePath,
  } = useAppStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // 자동 저장: 임시 문서는 메모리만 업데이트, 저장된 파일은 디스크에 씀
  const handleSave = useCallback(async (markdown: string) => {
    if (!activeTab) return;

    // 임시 문서: 메모리만 업데이트 (저장 다이얼로그 안 띄움)
    if (!activeTab.filePath) {
      updateTabContent(activeTab.id, markdown);
      return;
    }

    try {
      await writeTextFile(activeTab.filePath, markdown);
      updateTabContent(activeTab.id, markdown);
      markTabClean(activeTab.id);
    } catch (err) {
      console.error("저장 실패:", err);
    }
  }, [activeTab, updateTabContent, markTabClean]);

  // Ctrl+S 수동 저장: 임시 문서면 저장 다이얼로그
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        if (!activeTab || activeTab.filePath) return; // 저장된 파일은 TiptapEditor에서 처리
        e.preventDefault();
        const selected = await save({
          defaultPath: undefined,
          filters: [{ name: "Markdown", extensions: ["md"] }],
        });
        if (!selected) return;
        const fileName = selected.split("\\").pop() ?? activeTab.title;
        updateTabFilePath(activeTab.id, selected, fileName);
        try {
          await writeTextFile(selected, activeTab.content);
          markTabClean(activeTab.id);
          useAppStore.getState().refreshFileTree();
        } catch (err) {
          console.error("저장 실패:", err);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTab, updateTabFilePath, markTabClean]);

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
              <FileText size={32} color="#aaa" strokeWidth={1.5} />
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
