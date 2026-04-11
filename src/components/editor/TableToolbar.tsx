import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { Plus, Minus, Trash2, Copy, Scissors } from "lucide-react";

interface TableToolbarProps {
  editor: Editor;
}

export function TableToolbar({ editor }: TableToolbarProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const inTable = editor.isActive("table") || editor.isActive("tableCell") || editor.isActive("tableHeader");
      if (!inTable) { setPos(null); return; }

      try {
        const domSelection = window.getSelection();
        if (!domSelection?.anchorNode) { setPos(null); return; }
        const el = domSelection.anchorNode instanceof HTMLElement
          ? domSelection.anchorNode
          : domSelection.anchorNode.parentElement;
        const tableEl = el?.closest("table");
        if (!tableEl) { setPos(null); return; }
        const rect = tableEl.getBoundingClientRect();
        setPos({ top: rect.top - 36, left: rect.left });
      } catch { setPos(null); }
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => { editor.off("selectionUpdate", update); editor.off("transaction", update); };
  }, [editor]);

  if (!pos) return null;

  const btnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "4px",
    padding: "3px 8px", borderRadius: "4px", border: "none", cursor: "pointer",
    fontSize: "11px", fontWeight: 500, transition: "all 0.1s",
    background: "transparent", color: "var(--color-text-secondary)",
  };

  return (
    <div style={{
      position: "fixed", top: `${pos.top}px`, left: `${pos.left}px`,
      display: "flex", alignItems: "center", gap: "2px", padding: "3px 4px",
      background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-medium)",
      borderRadius: "6px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", zIndex: 50,
    }}>
      <button onClick={() => editor.chain().focus().addColumnAfter().run()} style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} title="열 추가">
        <Plus size={12} /><span>열</span>
      </button>
      <button onClick={() => editor.chain().focus().deleteColumn().run()} style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "#e53935"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-secondary)"; }} title="열 삭제">
        <Minus size={12} /><span>열</span>
      </button>
      <button onClick={() => editor.chain().focus().addRowAfter().run()} style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} title="행 추가">
        <Plus size={12} /><span>행</span>
      </button>
      <button onClick={() => editor.chain().focus().deleteRow().run()} style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "#e53935"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-secondary)"; }} title="행 삭제">
        <Minus size={12} /><span>행</span>
      </button>
      <div style={{ width: "1px", height: "16px", background: "var(--color-border-light)", margin: "0 2px" }} />
      <button onClick={() => { document.execCommand("copy"); }} style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} title="복사">
        <Copy size={12} />
      </button>
      <button onClick={() => { document.execCommand("cut"); }} style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} title="잘라내기">
        <Scissors size={12} />
      </button>
      <button onClick={() => editor.chain().focus().deleteTable().run()} style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "#e53935"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-secondary)"; }} title="표 삭제">
        <Trash2 size={12} />
      </button>
    </div>
  );
}
