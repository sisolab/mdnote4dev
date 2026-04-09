import { useEffect } from "react";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useAppStore } from "@/stores/appStore";
import { TiptapEditor } from "./TiptapEditor";

export function EditorArea() {
  const { selectedFile, fileContent, setFileContent } = useAppStore();

  useEffect(() => {
    if (!selectedFile) return;
    readTextFile(selectedFile).then(setFileContent).catch(console.error);
  }, [selectedFile, setFileContent]);

  const handleSave = async (markdown: string) => {
    if (!selectedFile) return;
    try {
      await writeTextFile(selectedFile, markdown);
      setFileContent(markdown);
    } catch (err) {
      console.error("저장 실패:", err);
    }
  };

  if (!selectedFile) {
    return (
      <main className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-bg-secondary flex items-center justify-center shadow-sm">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-text-tertiary"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="14,2 14,8 20,8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </div>
          <p className="text-text-tertiary text-sm">
            사이드바에서 문서를 선택하거나 새 문서를 만드세요
          </p>
        </div>
      </main>
    );
  }

  const fileName = selectedFile.split("\\").pop() ?? "";

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-bg-primary">
      {/* 파일 탭 바 */}
      <div className="h-9 flex items-center px-4 border-b border-border-light bg-bg-secondary shrink-0">
        <span className="text-sm text-text-secondary">{fileName}</span>
      </div>

      {/* TipTap 에디터 */}
      <div className="flex-1 min-h-0">
        <TiptapEditor content={fileContent} onSave={handleSave} />
      </div>
    </main>
  );
}
