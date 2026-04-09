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
import { useEffect, useCallback, useRef } from "react";
import { htmlToMarkdown, markdownToHtml } from "./markdown";
import { Toolbar } from "./Toolbar";

interface TiptapEditorProps {
  content: string; // 마크다운 문자열
  onSave: (markdown: string) => void;
}

export function TiptapEditor({ content, onSave }: TiptapEditorProps) {
  const lastMarkdown = useRef(content);

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
  });

  // 외부에서 content가 바뀌면 에디터 갱신
  useEffect(() => {
    if (!editor) return;
    if (content !== lastMarkdown.current) {
      lastMarkdown.current = content;
      editor.commands.setContent(markdownToHtml(content));
    }
  }, [content, editor]);

  // Ctrl+S 저장
  const handleSave = useCallback(() => {
    if (!editor) return;
    const md = htmlToMarkdown(editor.getHTML());
    lastMarkdown.current = md;
    onSave(md);
  }, [editor, onSave]);

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

  return (
    <div className="flex flex-col h-full">
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-auto px-12 py-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
