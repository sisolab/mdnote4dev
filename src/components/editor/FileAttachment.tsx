import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/stores/appStore";
import { useState, useEffect } from "react";
import { stat } from "@tauri-apps/plugin-fs";
import {
  FileText, FilePen, FileSpreadsheet, Presentation, BookOpen, FileArchive, File,
  FolderOpen, Star,
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
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 18px",
          margin: "4px 0",
          borderRadius: "6px",
          border: "1px solid var(--color-border-medium)",
          background: "var(--color-bg-secondary)",
          cursor: "pointer",
          maxWidth: "520px",
          transition: "all 0.15s",
          userSelect: "none",
          position: "relative",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
      >
        <Icon size={24} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {filename}{size > 0 && <span style={{ fontWeight: 400, color: "var(--color-text-tertiary)", marginLeft: "8px" }}>({formatSize(size)})</span>}
          </div>
          <div style={{
            fontSize: "10px", color: "var(--color-text-tertiary)", marginTop: "2px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {node.attrs.relativePath || filepath}
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); const folder = filepath.substring(0, filepath.lastIndexOf("\\")); invoke("open_in_explorer", { path: folder }); }}
            title="파일 위치 열기" style={{ ...actionBtnStyle, color: "var(--color-text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-active)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <FolderOpen size={14} />
          </button>
          <button onClick={async (e) => {
            e.stopPropagation();
            const store = useAppStore.getState();
            // 현재 탭의 filePath가 이 문서
            const activeTab = store.tabs.find((t) => t.id === store.activeTabId);
            if (activeTab?.filePath) {
              // 이미 이 문서가 열려있으니 아무것도 안 함
            }
          }}
            title="이 문서" style={{ ...actionBtnStyle, color: "var(--color-text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-active)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <FileText size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (isFav) removeFavoriteAttachment(filepath); else addFavoriteAttachment(filepath); }}
            title={isFav ? "즐겨찾기 해제" : "즐겨찾기 등록"} style={{ ...actionBtnStyle, color: isFav ? "#f5c518" : "var(--color-text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-active)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <Star size={14} style={isFav ? { fill: "#f5c518" } : {}} />
          </button>
        </div>
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

  addNodeView() {
    return ReactNodeViewRenderer(FileAttachmentView);
  },
});
