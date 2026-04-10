import type { Editor } from "@tiptap/react";
import { useRef, useState, useCallback, useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAppStore } from "@/stores/appStore";
import {
  Bold, Italic, Strikethrough, Code,
  List, ListOrdered, ListChecks,
  AlignLeft, AlignCenter, Columns2, Square, Star,
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
        height: "40px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        position: "relative",
        zIndex: 1,
        transition: "color 0.1s",
        color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
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
        background: "var(--color-accent)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      }} />
    </button>
  );
}

function Divider() {
  return <div style={{ width: "1px", height: "24px", background: "var(--color-border-light)", margin: "0 10px", flexShrink: 0 }} />;
}

function TableGridButton({ editor, onHover }: { editor: Editor; onHover: (el: HTMLButtonElement | null) => void }) {
  const [open, setOpen] = useState(false);
  const [hoverRow, setHoverRow] = useState(0);
  const [hoverCol, setHoverCol] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const MAX = 6;
  const CELL = 20;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    setTimeout(() => window.addEventListener("click", handler), 0);
    return () => window.removeEventListener("click", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => onHover(e.currentTarget)}
        title="표 삽입"
        style={{
          width: "34px", height: "40px", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent", cursor: "pointer",
          position: "relative", zIndex: 1, transition: "color 0.1s",
          color: open ? "var(--color-accent)" : "var(--color-text-secondary)",
          borderRadius: "3px",
        }}
      >
        <Table size={15} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: "0", zIndex: 9999,
          background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-medium)",
          borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          padding: "8px",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${MAX}, ${CELL}px)`, gap: "2px" }}>
            {Array.from({ length: MAX * MAX }).map((_, i) => {
              const r = Math.floor(i / MAX);
              const c = i % MAX;
              const active = r <= hoverRow && c <= hoverCol;
              return (
                <div
                  key={i}
                  onMouseEnter={() => { setHoverRow(r); setHoverCol(c); }}
                  onClick={(e) => {
                    e.stopPropagation();
                    editor.chain().focus().insertTable({ rows: r + 1, cols: c + 1, withHeaderRow: true }).run();
                    setOpen(false);
                  }}
                  style={{
                    width: CELL, height: CELL,
                    borderRadius: "2px",
                    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border-light)"}`,
                    background: active ? "var(--color-accent-subtle)" : "transparent",
                    cursor: "pointer", transition: "all 0.05s",
                  }}
                />
              );
            })}
          </div>
          <div style={{ textAlign: "center", fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "6px", fontWeight: 500 }}>
            {hoverRow + 1} × {hoverCol + 1}
          </div>
        </div>
      )}
    </div>
  );
}

export function Toolbar({ editor }: ToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const { settings, updateSetting } = useSettingsStore();
  const { selectedFile, favoriteFiles, addFavoriteFile, removeFavoriteFile } = useAppStore();
  const isFavorite = selectedFile ? favoriteFiles.includes(selectedFile) : false;

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
        background: "var(--color-bg-hover)",
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

      <TableGridButton editor={editor} onHover={handleHover} />

      {/* 오른쪽: 레이아웃 토글 */}
      <div style={{ flex: 1, minWidth: "8px" }} />

      <ToolbarButton
        onClick={() => updateSetting("widthMode", settings.widthMode === "fluid" ? "fixed" : "fluid")}
        active={settings.widthMode === "fixed"}
        title={settings.widthMode === "fluid" ? "고정폭으로 전환" : "가변폭으로 전환"}
        onHover={handleHover}
      >
        {settings.widthMode === "fluid" ? <Columns2 size={15} /> : <Square size={15} />}
      </ToolbarButton>

      <ToolbarButton
        onClick={() => updateSetting("pageAlign", settings.pageAlign === "left" ? "center" : "left")}
        active={settings.pageAlign === "center"}
        title={settings.pageAlign === "left" ? "가운데 정렬" : "왼쪽 정렬"}
        onHover={handleHover}
      >
        {settings.pageAlign === "left" ? <AlignLeft size={15} /> : <AlignCenter size={15} />}
      </ToolbarButton>

      <ToolbarButton
        onClick={() => {
          if (!selectedFile) return;
          if (isFavorite) removeFavoriteFile(selectedFile);
          else addFavoriteFile(selectedFile);
        }}
        active={isFavorite}
        title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 등록"}
        onHover={handleHover}
      >
        <Star size={15} style={isFavorite ? { color: "#f5c518", fill: "#f5c518" } : {}} />
      </ToolbarButton>
    </div>
  );
}
