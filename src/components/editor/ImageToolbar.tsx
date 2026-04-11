import { useEffect, useState, useRef, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { AlignLeft, AlignCenter, Copy, Scissors, Trash2, Image, Check } from "lucide-react";

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
  const [flash, setFlash] = useState<string | null>(null);

  const flashBtn = useCallback((id: string) => {
    setFlash(id);
    setTimeout(() => setFlash(null), 600);
  }, []);

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

      <div style={{ width: "1px", height: "16px", background: "var(--color-border-light)", margin: "0 2px" }} />

      <button onClick={async () => {
        try {
          const dom = editor.view.nodeDOM(editor.state.selection.from) as HTMLElement | null;
          const imgEl = dom?.tagName === "IMG" ? dom as HTMLImageElement : dom?.querySelector("img") as HTMLImageElement | null;
          if (!imgEl) return;
          const res = await fetch(imgEl.src);
          const blob = await res.blob();
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          flashBtn("img-copy");
        } catch (err) { console.error("이미지 복사 실패:", err); }
      }} title="이미지로 복사" style={{ padding: "3px 6px", borderRadius: "4px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", background: "transparent", color: flash === "img-copy" ? "#22c55e" : "var(--color-text-secondary)", transition: "all 0.15s" }}>
        {flash === "img-copy" ? <Check size={13} /> : <Image size={13} />}
      </button>
      <button onClick={() => { document.execCommand("copy"); flashBtn("copy"); }} title="복사" style={{ padding: "3px 6px", borderRadius: "4px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", background: "transparent", color: flash === "copy" ? "#22c55e" : "var(--color-text-secondary)", transition: "all 0.15s" }}>
        {flash === "copy" ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <button onClick={() => { document.execCommand("cut"); flashBtn("cut"); }} title="잘라내기" style={{ padding: "3px 6px", borderRadius: "4px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", background: "transparent", color: flash === "cut" ? "#22c55e" : "var(--color-text-secondary)", transition: "all 0.15s" }}>
        {flash === "cut" ? <Check size={13} /> : <Scissors size={13} />}
      </button>
      <button onClick={() => { editor.chain().focus().deleteSelection().run(); }} title="삭제" style={{ padding: "3px 6px", borderRadius: "4px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", background: "transparent", color: "var(--color-text-secondary)", transition: "all 0.1s" }}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}
