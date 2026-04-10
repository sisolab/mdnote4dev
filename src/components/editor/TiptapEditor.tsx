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
import { parseFrontmatter } from "@/utils/frontmatter";
import { Toolbar } from "./Toolbar";
import { useSettingsStore, getFontFamily } from "@/stores/settingsStore";
import { useAppStore } from "@/stores/appStore";

interface TiptapEditorProps {
  content: string;
  onSave: (markdown: string) => void;
}

export function TiptapEditor({ content, onSave }: TiptapEditorProps) {
  const lastMarkdown = useRef(content);
  const contentRef = useRef(content);
  contentRef.current = content;
  const { settings } = useSettingsStore();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: "code-block" } },
      }),
      Placeholder.configure({
        placeholder: "",
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
    const body = htmlToMarkdown(editor.getHTML());
    // frontmatter: store의 allTags에서 현재 파일의 태그를 가져와서 구성
    const state = useAppStore.getState();
    const filePath = state.selectedFile;
    const liveTags = filePath
      ? Object.keys(state.allTags).filter((tag) => state.allTags[tag]?.includes(filePath))
      : parseFrontmatter(contentRef.current).tags;
    const tagsStr = liveTags.length > 0 ? `tags: [${liveTags.join(", ")}]` : "";
    const md = tagsStr ? `---\n${tagsStr}\n---\n${body}` : body;
    lastMarkdown.current = md;
    onSave(md);
  }, [editor, onSave, content]);

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
    "--editor-code-padding": `${s.codePadding}px`,
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
        style={{ padding: "48px" }}
      >
        <div style={{
          ...(s.widthMode === "fixed" ? { maxWidth: `${s.editorMaxWidth}px`, width: "100%" } : { width: "100%" }),
          ...editorStyle,
        }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
