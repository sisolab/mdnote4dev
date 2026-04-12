import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/stores/appStore";
import { useState, useEffect } from "react";
import { stat } from "@tauri-apps/plugin-fs";
import {
  FileText, FilePen, FileSpreadsheet, Presentation, BookOpen, FileArchive, File,
  Star,
} from "lucide-react";

// 확장자 → 아이콘 매핑
const FILE_ICONS: Record<string, React.ComponentType<any>> = {
  pdf: FileText,
  doc: FilePen, docx: FilePen,
  xls: FileSpreadsheet, xlsx: FileSpreadsheet, csv: FileSpreadsheet,
  ppt: Presentation, pptx: Presentation,
  md: BookOpen, markdown: BookOpen,
  zip: FileArchive, rar: FileArchive, "7z": FileArchive,
};

// 더블클릭 시 직접 여는 확장자
export const OPENABLE_EXTS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx",
  "txt", "html", "htm", "md", "markdown", "rtf",
]);

export function getExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : "";
}

export function getIcon(filename: string) {
  const ext = getExt(filename);
  return FILE_ICONS[ext] || File;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileAttachmentView({ node }: NodeViewProps) {
  const filename = node.attrs.filename as string || "file";
  const filepath = node.attrs.filepath as string || "";
  const attrSize = node.attrs.filesize as number || 0;
  const [size, setSize] = useState(attrSize);

  useEffect(() => {
    if (attrSize > 0 || !filepath) return;
    stat(filepath).then((s) => setSize(s.size)).catch(() => {});
  }, [filepath, attrSize]);
  const Icon = getIcon(filename);
  const ext = getExt(filename);
  const { favoriteAttachments, addFavoriteAttachment, removeFavoriteAttachment } = useAppStore();
  const isFav = favoriteAttachments.includes(filepath);

  const handleDoubleClick = async () => {
    if (!filepath) return;
    try {
      if (OPENABLE_EXTS.has(ext)) {
        await invoke("open_file", { path: filepath });
      } else {
        const folder = filepath.substring(0, filepath.lastIndexOf("\\"));
        await invoke("open_in_explorer", { path: folder });
      }
    } catch (err) {
      console.error("파일 열기 실패:", err);
    }
  };

  const actionBtnStyle: React.CSSProperties = {
    width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center",
    border: "none", background: "transparent", cursor: "pointer", borderRadius: "4px",
  };

  return (
    <NodeViewWrapper>
      <div
        onDoubleClick={handleDoubleClick}
        contentEditable={false}
        title={`${filename}\n${formatSize(size)} · ${node.attrs.relativePath || filepath}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          padding: "8px 12px",
          margin: "4px 0",
          borderRadius: "6px",
          border: "1px solid var(--color-border-medium)",
          background: "var(--color-bg-secondary)",
          cursor: "pointer",
          transition: "all 0.15s",
          userSelect: "none",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
      >
        <Icon size={18} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
            {filename}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginTop: "18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", position: "absolute", left: 0, right: 0, top: 0 }}>
            {formatSize(size)} · {node.attrs.relativePath || filepath}
          </div>
          <div style={{ height: "18px" }} />
        </div>

        <button onClick={(e) => { e.stopPropagation(); if (isFav) removeFavoriteAttachment(filepath); else addFavoriteAttachment(filepath); }}
          title={isFav ? "즐겨찾기 해제" : "즐겨찾기 등록"} style={{ ...actionBtnStyle, color: isFav ? "#f5c518" : "var(--color-text-tertiary)", flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-active)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          <Star size={14} style={isFav ? { fill: "#f5c518" } : {}} />
        </button>
      </div>
    </NodeViewWrapper>
  );
}

export const FileAttachmentNode = Node.create({
  name: "fileAttachment",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      filename: { default: "" },
      filepath: { default: "" },
      relativePath: { default: "" },
      filesize: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: "file-attachment" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["file-attachment", mergeAttributes(HTMLAttributes)];
  },

  // @tiptap/markdown 직렬화: 마크다운 링크로 저장
  renderMarkdown(node: any) {
    const filename = node.attrs.filename || "file";
    const relativePath = node.attrs.relativePath || "";
    // 괄호 등 특수문자가 마크다운 링크 문법과 충돌하지 않도록 인코딩
    const safePath = relativePath.replace(/\(/g, "%28").replace(/\)/g, "%29");
    return `[${filename}](${safePath})\n\n`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileAttachmentView);
  },
});
