import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { Plus, Columns3, Trash2 } from "lucide-react";

interface TableToolbarProps {
  editor: Editor;
}

export function TableToolbar({ editor }: TableToolbarProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const inTable = editor.isActive("table") || editor.isActive("tableCell") || editor.isActive("tableHeader") || editor.isActive("tableRow");
      if (!inTable) {
        setPos(null);
        return;
      }

      // 테이블 DOM 요소 찾기: 선택 위치에서 가장 가까운 table 태그
      try {
        const domSelection = window.getSelection();
        if (!domSelection || !domSelection.anchorNode) { setPos(null); return; }
        const el = domSelection.anchorNode instanceof HTMLElement
          ? domSelection.anchorNode
          : domSelection.anchorNode.parentElement;
        const tableEl = el?.closest("table");
        if (!tableEl) { setPos(null); return; }

        const rect = tableEl.getBoundingClientRect();
        setPos({ top: rect.top - 36, left: rect.left });
      } catch {
        setPos(null);
      }
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  if (!pos) return null;

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: "4px",
    padding: "3px 8px", borderRadius: "4px", border: "none", cursor: "pointer",
    fontSize: "11px", fontWeight: 500, transition: "all 0.1s",
    background: active ? "var(--color-accent-subtle)" : "transparent",
    color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
  });

  const equalizeColumns = () => {
    // 현재 테이블의 열 수를 파악하고 균등 폭 설정
    const { $from } = editor.state.selection;
    let depth = $from.depth;
    while (depth > 0 && $from.node(depth).type.name !== "table") depth--;
    if (depth === 0) return;

    const table = $from.node(depth);
    const firstRow = table.firstChild;
    if (!firstRow) return;
    const colCount = firstRow.childCount;
    if (colCount === 0) return;

    // DOM에서 테이블 찾아서 각 셀 폭 균등 설정
    const domAtPos = editor.view.domAtPos($from.before(depth));
    const tableEl = (domAtPos.node as HTMLElement).closest?.("table") ?? domAtPos.node as HTMLElement;
    if (!tableEl || tableEl.tagName !== "TABLE") return;

    const equalWidth = Math.floor(tableEl.offsetWidth / colCount);
    const cells = tableEl.querySelectorAll("th, td");
    cells.forEach((cell) => {
      (cell as HTMLElement).style.width = `${equalWidth}px`;
      (cell as HTMLElement).style.minWidth = `${equalWidth}px`;
    });

    // colgroup도 업데이트
    const colgroup = tableEl.querySelector("colgroup");
    if (colgroup) {
      const cols = colgroup.querySelectorAll("col");
      cols.forEach((col) => {
        (col as HTMLElement).style.width = `${equalWidth}px`;
      });
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "3px 4px",
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-medium)",
        borderRadius: "6px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        zIndex: 50,
      }}
    >
      <button
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        style={btnStyle()}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        title="열 추가"
      >
        <Plus size={12} />
        <span>열</span>
      </button>
      <button
        onClick={() => editor.chain().focus().addRowAfter().run()}
        style={btnStyle()}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        title="행 추가"
      >
        <Plus size={12} />
        <span>행</span>
      </button>

      <div style={{ width: "1px", height: "16px", background: "var(--color-border-light)", margin: "0 2px" }} />

      <button
        onClick={equalizeColumns}
        style={btnStyle()}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        title="컬럼 폭 균등"
      >
        <Columns3 size={12} />
        <span>균등</span>
      </button>

      <div style={{ width: "1px", height: "16px", background: "var(--color-border-light)", margin: "0 2px" }} />

      <button
        onClick={() => editor.chain().focus().deleteTable().run()}
        style={btnStyle()}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "#e53935"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
        title="표 삭제"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
