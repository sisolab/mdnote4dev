import { useCallback, useEffect, useState } from "react";
import { writeTextFile, stat } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "@/stores/appStore";
import { TiptapEditor } from "./TiptapEditor";
import { TabBar } from "./TabBar";
import { StatusBar } from "./StatusBar";
import { TagExplorer } from "./TagExplorer";
import { AttachmentExplorer } from "./AttachmentExplorer";
import { TabExplorer } from "./TabExplorer";
import { FileText } from "lucide-react";
import { parseFrontmatter, updateFrontmatterTags } from "@/utils/frontmatter";

export function EditorArea() {
  const {
    tabs, activeTabId, updateTabContent, markTabClean,
    updateTabFilePath,
  } = useAppStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [fileSize, setFileSize] = useState(0);
  const [currentTags, setCurrentTags] = useState<string[]>([]);

  // 탭 변경 시 파일 정보 업데이트
  useEffect(() => {
    if (!activeTab) return;
    const content = activeTab.content;
    const fm = parseFrontmatter(content);
    setCurrentTags(fm.tags);

    if (activeTab.filePath) {
      stat(activeTab.filePath).then((s) => {
        setFileSize(s.size);
      }).catch(() => setFileSize(0));
    } else {
      setFileSize(new TextEncoder().encode(content).length);
    }
  }, [activeTab?.id, activeTab?.content]);

  // 자동 저장
  const handleSave = useCallback(async (markdown: string) => {
    if (!activeTab) return;

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

  // 태그 추가
  const handleAddTag = useCallback(async (tag: string) => {
    if (!activeTab) return;
    const content = activeTab.content;
    const fm = parseFrontmatter(content);
    if (fm.tags.includes(tag)) return;

    const newTags = [...fm.tags, tag];
    const newContent = updateFrontmatterTags(content, newTags);
    updateTabContent(activeTab.id, newContent);
    setCurrentTags(newTags);

    if (activeTab.filePath) {
      try {
        await writeTextFile(activeTab.filePath, newContent);
        markTabClean(activeTab.id);
      } catch {}
    }

    // 전역 태그 갱신
    const state = useAppStore.getState();
    const allTags = { ...state.allTags };
    if (!allTags[tag]) allTags[tag] = [];
    if (activeTab.filePath && !allTags[tag].includes(activeTab.filePath)) {
      allTags[tag] = [...allTags[tag], activeTab.filePath];
    }
    state.setAllTags(allTags);
  }, [activeTab, updateTabContent, markTabClean]);

  // 태그 제거
  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!activeTab) return;
    const content = activeTab.content;
    const fm = parseFrontmatter(content);
    const newTags = fm.tags.filter((t) => t !== tag);
    const newContent = updateFrontmatterTags(content, newTags);
    updateTabContent(activeTab.id, newContent);
    setCurrentTags(newTags);

    if (activeTab.filePath) {
      try {
        await writeTextFile(activeTab.filePath, newContent);
        markTabClean(activeTab.id);
      } catch (err) {
        console.error("태그 저장 실패:", err);
      }
    }

    // 전역 태그 갱신
    const state = useAppStore.getState();
    const allTags = { ...state.allTags };
    if (allTags[tag] && activeTab.filePath) {
      allTags[tag] = allTags[tag].filter((p) => p !== activeTab.filePath);
      if (allTags[tag].length === 0) delete allTags[tag];
    }
    state.setAllTags(allTags);
  }, [activeTab, updateTabContent, markTabClean]);

  // Ctrl+S 수동 저장
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        if (!activeTab || activeTab.filePath) return;
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
          window.dispatchEvent(new CustomEvent("manual-save"));
        } catch (err) {
          console.error("저장 실패:", err);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTab, updateTabFilePath, markTabClean]);

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-bg-primary" style={{ position: "relative" }}>
      <TabBar />

      {activeTab?.type === "tag-explorer" ? (
        <div className="flex-1 min-h-0">
          <TagExplorer />
        </div>
      ) : activeTab?.type === "attachment-explorer" ? (
        <div className="flex-1 min-h-0">
          <AttachmentExplorer />
        </div>
      ) : activeTab?.type === "tab-explorer" ? (
        <div className="flex-1 min-h-0">
          <TabExplorer />
        </div>
      ) : activeTab ? (
        <>
        <div className="flex-1 min-h-0">
          <TiptapEditor
            key={activeTab.id}
            content={activeTab.content}
            filePath={activeTab.filePath}
            onSave={handleSave}
          />
        </div>
        <StatusBar
          filePath={activeTab.filePath}
          fileSize={fileSize}
          tags={currentTags}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div style={{ width: "64px", height: "64px", margin: "0 auto 16px", borderRadius: "16px", background: "var(--color-bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={32} style={{ color: "var(--color-text-muted)" }} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: "13px", color: "var(--color-text-light)" }}>
              사이드바에서 문서를 선택하거나 새 문서를 만드세요
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
