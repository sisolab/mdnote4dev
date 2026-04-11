import type { Editor } from "@tiptap/react";
import { useRef, useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import {
  Bold, Italic, Strikethrough, Code,
  List, ListOrdered, ListChecks,
  Star, StarOff,
  Quote, SquareCode, Minus, Table, Smile, Paperclip, Home,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { saveFileToAssets } from "@/utils/imageUtils";

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
  const MAX = 6;
  const CELL = 20;

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
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
                    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border-medium)"}`,
                    background: active ? "var(--color-accent-subtle)" : "transparent",
                    cursor: "pointer",
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

const ICON_SECTIONS = [
  { label: "강조", icons: ["⭐", "❗", "‼️", "🔥", "💡", "📌", "🎯", "⚠️", "🚨", "💎"] },
  { label: "상태", icons: ["✅", "❌", "⭕", "❓", "❔", "🤔", "👀", "👍", "👎", "💯"] },
  { label: "할 일", icons: ["📝", "📋", "🔲", "▶️", "⏸️", "⏰", "📆", "🔔", "🏁", "🚀"] },
  { label: "정리", icons: ["📁", "📂", "🏷️", "🔗", "📎", "🔑", "🔒", "📊", "📈", "📉"] },
  { label: "참고", icons: ["💬", "📢", "✏️", "📖", "🔍", "💻", "🧪", "⚙️", "🛠️", "🔬"] },
  { label: "반응", icons: ["❤️", "🎉", "💪", "😊", "🤝", "🌟", "✨", "🏆", "🌱", "☀️"] },
  { label: "숫자", icons: ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"] },
];

function IconPickerButton({ editor, onHover }: { editor: Editor; onHover: (el: HTMLButtonElement | null) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onMouseEnter={(e) => onHover(e.currentTarget)}
        title="아이콘 삽입"
        style={{
          width: "34px", height: "40px", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent", cursor: "pointer",
          position: "relative", zIndex: 1, transition: "color 0.1s",
          color: open ? "var(--color-accent)" : "var(--color-text-secondary)",
          borderRadius: "3px",
        }}
      >
        <Smile size={15} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: "0", zIndex: 9999,
          background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-medium)",
          borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          padding: "10px 12px", width: "auto",
        }}>
          {ICON_SECTIONS.map((section) => (
            <div key={section.label} style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
              <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--color-text-tertiary)", width: "28px", flexShrink: 0, textAlign: "right", marginRight: "4px" }}>
                {section.label}
              </span>
              {section.icons.map((icon, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().insertContent(icon).run();
                    setOpen(false);
                  }}
                  style={{
                    width: "30px", height: "30px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "none", background: "transparent", cursor: "pointer",
                    fontSize: "18px", borderRadius: "4px",
                    transition: "background 0.1s", flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {icon}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolbarDropdown({
  icon, label, onHover, options,
}: {
  icon: React.ReactNode;
  label: string;
  onHover: (el: HTMLButtonElement | null) => void;
  options: { icon: React.ReactNode; label: string; active: boolean; isDefault?: boolean; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    setTimeout(() => window.addEventListener("click", handler), 0);
    window.addEventListener("keydown", escHandler);
    return () => { window.removeEventListener("click", handler); window.removeEventListener("keydown", escHandler); };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => onHover(e.currentTarget)}
        title={label}
        style={{
          width: "34px", height: "40px", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent", cursor: "pointer",
          position: "relative", zIndex: 1, transition: "color 0.1s",
          color: open ? "var(--color-accent)" : "var(--color-text-secondary)",
          borderRadius: "3px",
        }}
      >
        {icon}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: "0", zIndex: 9999,
          background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-medium)",
          borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          padding: "4px", minWidth: "120px",
        }}>
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); opt.onClick(); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                width: "100%", padding: "6px 12px", borderRadius: "3px",
                border: "none", cursor: "pointer", textAlign: "left",
                fontSize: "12px", fontWeight: opt.active ? 600 : 400,
                background: opt.active ? "var(--color-accent-subtle)" : "transparent",
                color: opt.active ? "var(--color-accent)" : "var(--color-text-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", width: "16px", justifyContent: "center" }}>{opt.icon}</span>
              <span>{opt.label}</span>
              {opt.isDefault && <Home size={11} style={{ opacity: 0.5, flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Toolbar({ editor }: ToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
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
      style={{ padding: "0 16px", position: "relative", zIndex: 10 }}
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

      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="제목 1 (Ctrl+1)" onHover={handleHover}>
        <span className="text-[12px] font-bold">H1</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="제목 2 (Ctrl+2)" onHover={handleHover}>
        <span className="text-[12px] font-bold">H2</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="제목 3 (Ctrl+3)" onHover={handleHover}>
        <span className="text-[12px] font-bold">H3</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} active={editor.isActive("heading", { level: 4 })} title="제목 4 (Ctrl+4)" onHover={handleHover}>
        <span className="text-[12px] font-bold">H4</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={!editor.isActive("heading")} title="일반 텍스트 (Ctrl+5)" onHover={handleHover}>
        <span className="text-[12px] font-bold">A</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="굵게 (Ctrl+B)" onHover={handleHover}>
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="기울임 (Ctrl+I)" onHover={handleHover}>
        <Italic size={15} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="취소선 (Ctrl+Shift+X)" onHover={handleHover}>
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
      <IconPickerButton editor={editor} onHover={handleHover} />
      <ToolbarButton
        onClick={async () => {
          const srcPath = await open({ multiple: false });
          if (!srcPath || typeof srcPath !== "string") return;
          // 현재 탭의 파일 경로
          const { tabs, activeTabId } = useAppStore.getState();
          const activeTab = tabs.find((t) => t.id === activeTabId);
          const docPath = activeTab?.filePath;
          if (!docPath) { console.error("문서를 먼저 저장하세요"); return; }
          try {
            const { relativePath, filename, size } = await saveFileToAssets(docPath, srcPath);
            const docDir = docPath.substring(0, docPath.lastIndexOf("\\"));
            const filepath = `${docDir}\\${relativePath.substring(2).replace(/\//g, "\\")}`;
            editor.chain().focus().insertContent([
              { type: "fileAttachment", attrs: { filename, filepath, relativePath, filesize: size } },
              { type: "paragraph" },
            ]).run();
          } catch (err) {
            console.error("파일 첨부 실패:", err);
          }
        }}
        title="파일 첨부"
        onHover={handleHover}
      >
        <Paperclip size={15} />
      </ToolbarButton>

      {/* 오른쪽: 즐겨찾기 */}
      <div style={{ flex: 1, minWidth: "8px" }} />

      <ToolbarDropdown
        icon={<Star size={15} style={isFavorite ? { color: "#f5c518", fill: "#f5c518" } : {}} />}
        label="즐겨찾기"
        onHover={handleHover}
        options={[
          { icon: <Star size={14} style={{ color: "#f5c518", fill: "#f5c518" }} />, label: "즐겨찾기 추가", active: isFavorite, onClick: () => { if (selectedFile && !isFavorite) addFavoriteFile(selectedFile); } },
          { icon: <StarOff size={14} />, label: "즐겨찾기 해제", active: !isFavorite, onClick: () => { if (selectedFile && isFavorite) removeFavoriteFile(selectedFile); } },
        ]}
      />
    </div>
  );
}
