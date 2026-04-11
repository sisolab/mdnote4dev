import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { invoke } from "@tauri-apps/api/core";
import {
  FileText, FilePen, FileSpreadsheet, Presentation, BookOpen, FileArchive, File,
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
const OPENABLE_EXTS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx",
  "txt", "html", "htm", "md", "markdown", "rtf",
]);

function getExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : "";
}

function getIcon(filename: string) {
  const ext = getExt(filename);
  return FILE_ICONS[ext] || File;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileAttachmentView({ node }: NodeViewProps) {
  const filename = node.attrs.filename as string || "file";
  const filepath = node.attrs.filepath as string || "";
  const size = node.attrs.filesize as number || 0;
  const Icon = getIcon(filename);
  const ext = getExt(filename);

  const handleDoubleClick = async () => {
    if (!filepath) return;
    // 상대경로 → 절대경로는 문서 경로 기준으로 해야 하지만,
    // filepath에 절대경로가 저장되어 있으면 그대로 사용
    try {
      if (OPENABLE_EXTS.has(ext)) {
        await invoke("open_file", { path: filepath });
      } else {
        // 폴더 열기
        const folder = filepath.substring(0, filepath.lastIndexOf("\\"));
        await invoke("open_in_explorer", { path: folder });
      }
    } catch (err) {
      console.error("파일 열기 실패:", err);
    }
  };

  return (
    <NodeViewWrapper>
      <div
        onDoubleClick={handleDoubleClick}
        contentEditable={false}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 16px",
          margin: "4px 0",
          borderRadius: "6px",
          border: "1px solid var(--color-border-medium)",
          background: "var(--color-bg-secondary)",
          cursor: "pointer",
          maxWidth: "400px",
          transition: "all 0.15s",
          userSelect: "none",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
      >
        <Icon size={24} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
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
