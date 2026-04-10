import type { Editor } from "@tiptap/react";
import { useRef, useState, useCallback } from "react";

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
      {/* 미니멀 언더라인 — 절대 위치 */}
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
      {/* 슬라이딩 하이라이트 */}
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

      {/* 헤딩 */}
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
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M4 3h5a3 3 0 010 6H4V3zM4 9h6a3 3 0 010 6H4V9z" stroke="currentColor" strokeWidth="1.5" /></svg>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="기울임 (Ctrl+I)" onHover={handleHover}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M10 3H6M10 13H6M9 3L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="취소선" onHover={handleHover}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M5 4h5a2 2 0 010 4M6 8a2.5 2.5 0 000 5h4a2 2 0 000-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="인라인 코드" onHover={handleHover}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M5 4L2 8l3 4M11 4l3 4-3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="글머리 기호 목록" onHover={handleHover}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="4" r="1.2" fill="currentColor" /><circle cx="3" cy="8" r="1.2" fill="currentColor" /><circle cx="3" cy="12" r="1.2" fill="currentColor" /><path d="M6 4h8M6 8h8M6 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="번호 목록" onHover={handleHover}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><text x="1.5" y="5.5" fill="currentColor" fontSize="5" fontWeight="bold">1</text><text x="1.5" y="9.5" fill="currentColor" fontSize="5" fontWeight="bold">2</text><text x="1.5" y="13.5" fill="currentColor" fontSize="5" fontWeight="bold">3</text><path d="M6 4h8M6 8h8M6 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="체크리스트" onHover={handleHover}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M3 5l1 1 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M9 4h5M9 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="인용문" onHover={handleHover}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 4h2a2 2 0 012 2v1a2 2 0 01-2 2H4a1 1 0 01-1-1V4zM9 4h2a2 2 0 012 2v1a2 2 0 01-2 2h-1a1 1 0 01-1-1V4z" fill="currentColor" opacity="0.6" /></svg>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="코드 블록" onHover={handleHover}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" /><path d="M5 6L3.5 8 5 10M11 6l1.5 2L11 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="수평선" onHover={handleHover}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="표 삽입" onHover={handleHover}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M2 6h12M2 10h12M6 2v12M10 2v12" stroke="currentColor" strokeWidth="1" /></svg>
      </ToolbarButton>
    </div>
  );
}
