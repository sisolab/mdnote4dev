import { useEffect, useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { ExternalLink, FolderOpen, Download, Copy, Scissors, Trash2, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";

const OPENABLE_EXTS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx",
  "txt", "html", "htm", "md", "markdown", "rtf",
]);

interface FileToolbarProps {
  editor: Editor;
}

export function FileToolbar({ editor }: FileToolbarProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [attrs, setAttrs] = useState<{ filename: string; filepath: string } | null>(null);

  const flashBtn = useCallback((id: string) => {
    setFlash(id);
    setTimeout(() => setFlash(null), 600);
  }, []);

  useEffect(() => {
    const update = () => {
      if (!editor.isActive("fileAttachment")) {
        setPos(null);
        setAttrs(null);
        return;
      }
      const { node } = editor.state.selection as any;
      if (!node || node.type.name !== "fileAttachment") {
        setPos(null);
        return;
      }

      setAttrs({ filename: node.attrs.filename, filepath: node.attrs.filepath });

      // NodeView의 DOM 찾기
      const dom = editor.view.nodeDOM(editor.state.selection.from) as HTMLElement | null;
      if (!dom) { setPos(null); return; }
      const rect = dom.getBoundingClientRect();
      setPos({ top: rect.top - 36, left: rect.left });
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => { editor.off("selectionUpdate", update); editor.off("transaction", update); };
  }, [editor]);

  if (!pos || !attrs) return null;

  const ext = attrs.filename.includes(".") ? attrs.filename.substring(attrs.filename.lastIndexOf(".") + 1).toLowerCase() : "";
  const isOpenable = OPENABLE_EXTS.has(ext);

  const btnStyle: React.CSSProperties = {
    padding: "3px 6px", borderRadius: "4px", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", gap: "4px",
    background: "transparent", color: "var(--color-text-secondary)",
    fontSize: "11px", transition: "all 0.15s",
  };

  return (
    <div style={{
      position: "fixed", top: `${pos.top}px`, left: `${pos.left}px`,
      display: "flex", alignItems: "center", gap: "2px", padding: "3px 4px",
      background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-medium)",
      borderRadius: "6px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", zIndex: 50,
    }}>
      {/* 열기 / 위치 열기 */}
      {isOpenable ? (
        <button onClick={() => { invoke("open_file", { path: attrs.filepath }); }} style={btnStyle} title="열기">
          <ExternalLink size={13} /><span>열기</span>
        </button>
      ) : (
        <button onClick={() => {
          const folder = attrs.filepath.substring(0, attrs.filepath.lastIndexOf("\\"));
          invoke("open_in_explorer", { path: folder });
        }} style={btnStyle} title="위치 열기">
          <FolderOpen size={13} /><span>위치 열기</span>
        </button>
      )}

      <div style={{ width: "1px", height: "16px", background: "var(--color-border-light)", margin: "0 2px" }} />

      {/* 다른 이름으로 저장 */}
      <button onClick={async () => {
        try {
          const defaultName = attrs.filename;
          const ext = defaultName.includes(".") ? defaultName.substring(defaultName.lastIndexOf(".") + 1) : "";
          const dest = await save({ defaultPath: defaultName, filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : [] });
          if (!dest) return;
          const data = await readFile(attrs.filepath);
          await writeFile(dest, data);
          flashBtn("save");
        } catch (err) { console.error("저장 실패:", err); }
      }} style={{ ...btnStyle, color: flash === "save" ? "#22c55e" : "var(--color-text-secondary)" }} title="다른 이름으로 저장">
        {flash === "save" ? <Check size={13} /> : <Download size={13} />}
      </button>

      <div style={{ width: "1px", height: "16px", background: "var(--color-border-light)", margin: "0 2px" }} />

      {/* 복사 */}
      <button onClick={() => { document.execCommand("copy"); flashBtn("copy"); }}
        style={{ ...btnStyle, color: flash === "copy" ? "#22c55e" : "var(--color-text-secondary)" }} title="복사">
        {flash === "copy" ? <Check size={13} /> : <Copy size={13} />}
      </button>
      {/* 잘라내기 */}
      <button onClick={() => { document.execCommand("cut"); flashBtn("cut"); }}
        style={{ ...btnStyle, color: flash === "cut" ? "#22c55e" : "var(--color-text-secondary)" }} title="잘라내기">
        {flash === "cut" ? <Check size={13} /> : <Scissors size={13} />}
      </button>
      {/* 삭제 */}
      <button onClick={() => { editor.chain().focus().deleteSelection().run(); }} style={btnStyle} title="삭제">
        <Trash2 size={13} />
      </button>
    </div>
  );
}
