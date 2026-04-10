import type { Editor } from "@tiptap/react";
import { useRef, useState, useCallback } from "react";
import {
  Bold, Italic, Strikethrough, Code,
  List, ListOrdered, ListChecks,
  Quote, SquareCode, Minus, Table,
} from "lucide-react";

interface ToolbarProps {
  editor: Editor;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
  onHover,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  onHover: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      onMouseEnter={(e) => onHover(e.currentTarget)}
      title={title}
      style={{
        width: "34px",
        height: "38px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        position: "relative",
        zIndex: 1,
        transition: "color 0.1s",
        color: active ? "#1a73e8" : "#555",
        fontWeight: 600,
        fontSize: "11px",
        borderRadius: "3px",
      }}
      className=""
    >
      {children}
      <div style={{
        position: "absolute",
        bottom: "2px",
        left: "50%",
        transform: "translateX(-50%)",
        width: active ? "14px" : "0px",
        height: "2px",
        borderRadius: "1px",
        background: "#1a73e8",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      }} />
    </button>
  );
}

function Divider() {
  return <div style={{ width: "1px", height: "24px", background: "#eeeeee", margin: "0 10px" }} />;
}

export function Toolbar({ editor }: ToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const handleHover = useCallback((el: HTMLButtonElement | null) => {
    if (!el || !containerRef.current) {
      setHighlight(null);
      return;
    }
    const cr = containerRef.current.getBoundingClientRect();
    const br = el.getBoundingClientRect();
    setHighlight({ left: br.left - cr.left, top: br.top - cr.top, width: br.width, height: br.height });
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => setHighlight(null)}
      style={{ padding: "0 16px", position: "relative" }}
      className="flex items-center gap-0 border-b border-border-light bg-bg-frosted backdrop-blur-[8px] shrink-0"
    >
      <div style={{
        position: "absolute",
        left: highlight ? `${highlight.left}px` : 0,
        top: highlight ? `${highlight.top}px` : 0,
        width: highlight ? `${highlight.width}px` : 0,
        height: highlight ? `${highlight.height}px` : 0,
        background: "#f5f5f5",
        borderRadius: "3px",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: highlight ? 1 : 0,
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="제목 1 (Ctrl+Alt+1)" onHover={handleHover}>
        <span className="text-[12px] font-bold">H1</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="제목 2 (Ctrl+Alt+2)" onHover={handleHover}>
        <span className="text-[12px] font-bold">H2</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="제목 3 (Ctrl+Alt+3)" onHover={handleHover}>
        <span className="text-[12px] font-bold">H3</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="굵게 (Ctrl+B)" onHover={handleHover}>
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="기울임 (Ctrl+I)" onHover={handleHover}>
        <Italic size={15} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="취소선" onHover={handleHover}>
        <Strikethrough size={15} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="인라인 코드" onHover={handleHover}>
        <Code size={15} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="글머리 기호 목록" onHover={handleHover}>
        <List size={15} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="번호 목록" onHover={handleHover}>
        <ListOrdered size={15} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="체크리스트" onHover={handleHover}>
        <ListChecks size={15} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="인용문" onHover={handleHover}>
        <Quote size={15} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="코드 블록" onHover={handleHover}>
        <SquareCode size={15} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="수평선" onHover={handleHover}>
        <Minus size={15} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="표 삽입" onHover={handleHover}>
        <Table size={15} />
      </ToolbarButton>
    </div>
  );
}
