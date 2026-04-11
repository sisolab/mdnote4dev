import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { liftListItem, sinkListItem } from "@tiptap/pm/schema-list";
import { CodeBlockView } from "./CodeBlockView";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { CustomImage } from "./ImageExtension";
import { Underline } from "@tiptap/extension-underline";
import { Typography } from "@tiptap/extension-typography";
import { useEffect, useCallback, useRef, useState } from "react";
import { htmlToMarkdown, markdownToHtml } from "./markdown";
import { parseFrontmatter } from "@/utils/frontmatter";
import { saveImageToAssets } from "@/utils/imageUtils";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Toolbar } from "./Toolbar";
import { ImageToolbar } from "./ImageToolbar";
import { TableToolbar } from "./TableToolbar";
import { useSettingsStore, getFontFamily } from "@/stores/settingsStore";

interface TiptapEditorProps {
  content: string;
  filePath: string | null;
  onSave: (markdown: string) => void;
}

export function TiptapEditor({ content, filePath, onSave }: TiptapEditorProps) {
  const lastMarkdown = useRef(content);
  const contentRef = useRef(content);
  contentRef.current = content;
  const { settings } = useSettingsStore();

  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false, // CodeBlockLowlight로 대체
      }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView);
        },
      }).configure({
        lowlight: createLowlight(common),
        defaultLanguage: null,
        HTMLAttributes: { class: "code-block" },
      }),
      Placeholder.configure({
        placeholder: "",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      CustomImage,
      Underline,
      Typography,
    ],
    content: markdownToHtml(content, filePath),
    editorProps: {
      attributes: {
        class: "outline-none prose prose-sm max-w-none",
      },
      handleKeyDown: (view, event) => {
        // Ctrl+1~5: 제목/일반텍스트
        if (event.ctrlKey && !event.altKey && !event.shiftKey && ["1","2","3","4","5"].includes(event.key)) {
          event.preventDefault();
          const num = parseInt(event.key);
          if (num >= 1 && num <= 4) {
            const heading = view.state.schema.nodes.heading;
            const { $from } = view.state.selection;
            const isActive = $from.parent.type === heading && $from.parent.attrs.level === num;
            if (isActive) {
              // 토글: 이미 같은 제목이면 paragraph로
              const paragraph = view.state.schema.nodes.paragraph;
              view.dispatch(view.state.tr.setBlockType($from.before($from.depth), $from.after($from.depth), paragraph));
            } else {
              view.dispatch(view.state.tr.setBlockType($from.before($from.depth), $from.after($from.depth), heading, { level: num }));
            }
          } else {
            // Ctrl+5: 일반 텍스트
            const paragraph = view.state.schema.nodes.paragraph;
            const { $from } = view.state.selection;
            view.dispatch(view.state.tr.setBlockType($from.before($from.depth), $from.after($from.depth), paragraph));
          }
          return true;
        }


        // Ctrl+Shift+X: 취소선
        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "x") {
          event.preventDefault();
          const mark = view.state.schema.marks.strike;
          if (mark) {
            const { from, to } = view.state.selection;
            if (view.state.doc.rangeHasMark(from, to, mark)) {
              view.dispatch(view.state.tr.removeMark(from, to, mark));
            } else {
              view.dispatch(view.state.tr.addMark(from, to, mark.create()));
            }
          }
          return true;
        }

        if (event.key !== "Tab") return false;
        event.preventDefault();
        const state = view.state;
        const { $from } = state.selection;

        // 코드블록: tabSize에 따라 스페이스 삽입
        if ($from.parent.type.name === "codeBlock") {
          const tabSize = useSettingsStore.getState().tabSize;
          const indent = " ".repeat(tabSize);
          if (event.shiftKey) {
            const lineStart = state.doc.resolve($from.start());
            const text = state.doc.textBetween(lineStart.pos, $from.pos);
            if (text.startsWith(indent)) {
              view.dispatch(state.tr.delete(lineStart.pos, lineStart.pos + tabSize));
            }
          } else {
            view.dispatch(state.tr.insertText(indent));
          }
          return true;
        }

        // 리스트: 들여쓰기/내어쓰기
        for (let d = $from.depth; d > 0; d--) {
          const name = $from.node(d).type.name;
          if (name === "listItem" || name === "taskItem") {
            const nodeType = state.schema.nodes[name];
            if (event.shiftKey) {
              liftListItem(nodeType)(state, view.dispatch);
            } else {
              sinkListItem(nodeType)(state, view.dispatch);
            }
            return true;
          }
        }

        return true;
      },
    },
    onTransaction: (_props) => setTick((t) => t + 1),
  });

  // 툴바 active 상태 즉시 반영용
  const [, setTick] = useState(0);

  // 이미지 붙여넣기 핸들러
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom;
    const handler = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      // HTML 데이터가 있으면 이미지 붙여넣기 건너뛰기 (엑셀 등 복합 클립보드)
      const hasHtml = Array.from(items).some((item) => item.type === "text/html");
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/") && !hasHtml) {
          e.preventDefault();
          e.stopPropagation();
          const blob = item.getAsFile();
          if (!blob) return;
          const fp = filePathRef.current;
          if (!fp) {
            // 미저장 문서 — 이미지 붙여넣기 무시
            return;
          }
          try {
            const relativePath = await saveImageToAssets(fp, blob);
            const docDir = fp.substring(0, fp.lastIndexOf("\\"));
            const absPath = `${docDir}\\${relativePath.substring(2).replace(/\//g, "\\")}`;
            const assetUrl = convertFileSrc(absPath);
            // 원본 크기 확인: 320보다 작으면 원본, 아니면 320
            const img = new Image();
            img.src = assetUrl;
            await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
            const width = img.naturalWidth > 0 && img.naturalWidth < 320 ? 0 : 320;
            editor.chain().focus().setImage({ src: assetUrl, width, align: "left" } as any).run();
          } catch {}
          return;
        }
      }
    };
    el.addEventListener("paste", handler);
    return () => el.removeEventListener("paste", handler);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (content !== lastMarkdown.current) {
      lastMarkdown.current = content;
      editor.commands.setContent(markdownToHtml(content, filePath));
    }
  }, [content, editor]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    const body = htmlToMarkdown(editor.getHTML());
    // frontmatter 보존: 현재 탭 content에서 frontmatter를 그대로 유지
    const fm = parseFrontmatter(contentRef.current);
    const md = fm.raw ? `---\n${fm.raw}\n---\n${body}` : body;
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
      <ImageToolbar editor={editor} />
      <TableToolbar editor={editor} />
      <div
        className="flex-1 overflow-auto"
        style={{ padding: "24px 48px", cursor: "text" }}
        onMouseDown={(e) => {
          // 에디터 내부 콘텐츠가 아닌 빈 영역 클릭 시 클릭 위치에 가장 가까운 곳에 포커스
          if (e.target === e.currentTarget || !(e.target as HTMLElement).closest(".tiptap")) {
            e.preventDefault();
            const editorRect = editor.view.dom.getBoundingClientRect();
            const isLeft = e.clientX < editorRect.left;
            const isRight = e.clientX > editorRect.right;
            // 좌우 바깥이면 X를 에디터 안쪽 끝으로 보정해서 해당 줄의 맨앞/맨뒤로
            const x = isLeft ? editorRect.left + 1 : isRight ? editorRect.right - 1 : e.clientX;
            const pos = editor.view.posAtCoords({ left: x, top: e.clientY });
            if (pos) {
              editor.commands.focus();
              if (isLeft) {
                // 줄의 맨 앞으로
                const resolved = editor.state.doc.resolve(pos.pos);
                editor.commands.setTextSelection(resolved.start());
              } else if (isRight) {
                // 줄의 맨 뒤로
                const resolved = editor.state.doc.resolve(pos.pos);
                editor.commands.setTextSelection(resolved.end());
              } else {
                editor.commands.setTextSelection(pos.pos);
              }
            } else {
              editor.commands.focus("end");
            }
          }
        }}
      >
        <div style={{
          ...(s.widthMode === "fixed"
            ? { width: `${s.editorMaxWidth}px`, minWidth: `${s.editorMaxWidth}px`, margin: s.pageAlign === "center" ? "0 auto" : undefined }
            : { width: "100%" }),
          ...editorStyle,
        }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
