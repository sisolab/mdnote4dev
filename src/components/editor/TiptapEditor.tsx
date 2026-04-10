import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Image } from "@tiptap/extension-image";
import { Underline } from "@tiptap/extension-underline";
import { Typography } from "@tiptap/extension-typography";
import { useEffect, useCallback, useRef, useState } from "react";
import { htmlToMarkdown, markdownToHtml } from "./markdown";
import { Toolbar } from "./Toolbar";
import { useSettingsStore, getFontFamily } from "@/stores/settingsStore";

interface TiptapEditorProps {
  content: string;
  onSave: (markdown: string) => void;
}

export function TiptapEditor({ content, onSave }: TiptapEditorProps) {
  const lastMarkdown = useRef(content);
  const { settings } = useSettingsStore();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: "code-block" } },
      }),
      Placeholder.configure({
        placeholder: "마크다운을 입력하세요...",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
      Underline,
      Typography,
    ],
    content: markdownToHtml(content),
    editorProps: {
      attributes: {
        class: "outline-none prose prose-sm max-w-none",
      },
    },
    onTransaction: (_props) => setTick((t) => t + 1),
  });

  // 툴바 active 상태 즉시 반영용
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return;
    if (content !== lastMarkdown.current) {
      lastMarkdown.current = content;
      editor.commands.setContent(markdownToHtml(content));
    }
  }, [content, editor]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    const md = htmlToMarkdown(editor.getHTML());
    lastMarkdown.current = md;
    onSave(md);
  }, [editor, onSave]);

  // 실시간 자동 저장 (타이핑 멈추고 500ms 후)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(handleSave, 500);
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      clearTimeout(saveTimer.current);
    };
  }, [editor, handleSave]);

  // Ctrl+S 즉시 저장도 유지
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  if (!editor) return null;

  const s = settings;
  const scale = s.headingScale;

  const editorStyle = {
    "--editor-font-size": `${s.fontSize}px`,
    "--editor-line-height": `${s.lineHeight}`,
    "--editor-paragraph-spacing": `${s.paragraphSpacing}rem`,
    "--editor-font-family": getFontFamily(s.fontFamily),
    "--editor-letter-spacing": `${s.letterSpacing}px`,
    "--editor-code-font-size": `${s.codeFontSize}px`,
    "--editor-code-line-height": `${s.codeLineHeight}`,
    "--editor-h1-size": `${s.fontSize * scale * scale * scale}px`,
    "--editor-h2-size": `${s.fontSize * scale * scale}px`,
    "--editor-h3-size": `${s.fontSize * scale}px`,
    "--editor-h4-size": `${s.fontSize * 1.05}px`,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col h-full">
      <Toolbar editor={editor} />
      <div
        className={`flex-1 overflow-auto ${s.pageAlign === "center" ? "flex justify-center" : ""}`}
        style={{ padding: `${s.editorPaddingY}px ${s.editorPaddingX}px` }}
      >
        <div style={{
          ...(s.widthMode === "fixed" ? { width: `${s.editorMaxWidth}px` } : { maxWidth: `${s.editorMaxWidth}px`, width: "100%" }),
          ...editorStyle,
        }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
