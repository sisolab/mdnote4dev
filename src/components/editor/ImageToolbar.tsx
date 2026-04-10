import { useEffect, useState, useRef } from "react";
import { Editor } from "@tiptap/react";
import { AlignLeft, AlignCenter } from "lucide-react";

interface ImageToolbarProps {
  editor: Editor;
}

const SIZES = [
  { label: "160", value: 160 },
  { label: "240", value: 240 },
  { label: "320", value: 320 },
  { label: "400", value: 400 },
  { label: "480", value: 480 },
  { label: "원본", value: 0 },
];

export function ImageToolbar({ editor }: ImageToolbarProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      if (!editor.isActive("image")) {
        setPos(null);
        return;
      }
      // 선택된 이미지 DOM 요소 찾기
      const { node } = editor.state.selection as any;
      if (!node || node.type.name !== "image") {
        setPos(null);
        return;
      }

      const dom = editor.view.nodeDOM(editor.state.selection.from) as HTMLElement | null;
      const imgEl = dom?.tagName === "IMG" ? dom : dom?.querySelector("img");
      if (!imgEl) { setPos(null); return; }

      const rect = imgEl.getBoundingClientRect();
      setPos({ top: rect.top - 40, left: rect.left });
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  if (!pos) return null;

  const attrs = (editor.state.selection as any).node?.attrs ?? {};
  const currentWidth = attrs.width ?? 120;
  const currentAlign = attrs.align ?? "left";

  const setWidth = (w: number) => {
    editor.chain().focus().updateAttributes("image", { width: w }).run();
  };

  const setAlign = (a: string) => {
    editor.chain().focus().updateAttributes("image", { align: a }).run();
  };

  return (
    <div
      ref={ref}
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
        fontSize: "11px",
      }}
    >
      {/* 사이즈 */}
      {SIZES.map((s) => (
        <button
          key={s.label}
          onClick={() => setWidth(s.value)}
          style={{
            padding: "3px 8px",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
            fontWeight: (s.value === 0 ? currentWidth === 0 : currentWidth === s.value) ? 600 : 400,
            background: (s.value === 0 ? currentWidth === 0 : currentWidth === s.value) ? "var(--color-accent-subtle)" : "transparent",
            color: (s.value === 0 ? currentWidth === 0 : currentWidth === s.value) ? "var(--color-accent)" : "var(--color-text-secondary)",
            transition: "all 0.1s",
          }}
        >
          {s.label}
        </button>
      ))}

      <div style={{ width: "1px", height: "16px", background: "var(--color-border-light)", margin: "0 2px" }} />

      {/* 정렬 */}
      <button
        onClick={() => setAlign("left")}
        style={{
          padding: "3px 6px",
          borderRadius: "4px",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          background: currentAlign === "left" ? "var(--color-accent-subtle)" : "transparent",
          color: currentAlign === "left" ? "var(--color-accent)" : "var(--color-text-secondary)",
          transition: "all 0.1s",
        }}
      >
        <AlignLeft size={13} />
      </button>
      <button
        onClick={() => setAlign("center")}
        style={{
          padding: "3px 6px",
          borderRadius: "4px",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          background: currentAlign === "center" ? "var(--color-accent-subtle)" : "transparent",
          color: currentAlign === "center" ? "var(--color-accent)" : "var(--color-text-secondary)",
          transition: "all 0.1s",
        }}
      >
        <AlignCenter size={13} />
      </button>
    </div>
  );
}
