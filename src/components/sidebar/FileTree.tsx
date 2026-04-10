import { useEffect, useState, useRef, useCallback } from "react";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, type FileEntry } from "@/stores/appStore";
import { ChevronRight, FileText } from "lucide-react";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";

async function loadDirectory(path: string): Promise<FileEntry[]> {
  try {
    const entries = await readDir(path);
    const result: FileEntry[] = entries
      .map((entry) => ({
        name: entry.name ?? "",
        path: `${path}\\${entry.name}`,
        isDirectory: entry.isDirectory,
      }))
      .filter((e) => e.name && !e.name.startsWith("."))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    return result;
  } catch {
    return [];
  }
}

function FileTreeItem({
  entry,
  depth,
  onHover,
  onContextMenu,
}: {
  entry: FileEntry;
  depth: number;
  onHover: (el: HTMLButtonElement | null) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}) {
  const { expandedFolders, toggleFolder, selectedFile, openTab, fileTreeVersion } =
    useAppStore();
  const [children, setChildren] = useState<FileEntry[]>([]);
  const isExpanded = expandedFolders.has(entry.path);
  const isSelected = selectedFile === entry.path;

  useEffect(() => {
    if (isExpanded && entry.isDirectory) {
      loadDirectory(entry.path).then(setChildren);
    }
  }, [isExpanded, entry.path, entry.isDirectory, fileTreeVersion]);

  const handleClick = async () => {
    if (entry.isDirectory) {
      toggleFolder(entry.path);
    } else if (entry.name.endsWith(".md")) {
      try {
        const content = await readTextFile(entry.path);
        openTab(entry.path, entry.name, content);
      } catch (err) {
        console.error("파일 읽기 실패:", err);
      }
    }
  };

  const isMarkdown = entry.name.endsWith(".md");

  return (
    <div>
      <button
        onClick={handleClick}
        onMouseEnter={(e) => onHover(e.currentTarget)}
        onContextMenu={(e) => onContextMenu(e, entry)}
        className={`w-full flex items-center gap-2 text-[14px] relative z-10 ${
          isSelected
            ? "text-accent font-semibold"
            : "text-text-primary"
        } ${!entry.isDirectory && !isMarkdown ? "opacity-30" : ""}`}
        style={{
          paddingLeft: `${depth * 16 + 32}px`, paddingRight: "16px", height: "36px",
        }}
      >
        {entry.isDirectory ? (
          <ChevronRight
            size={12}
            className={`shrink-0 transition-transform duration-[0.15s] text-text-light ${isExpanded ? "rotate-90" : ""}`}
          />
        ) : (
          <FileText size={13} className="shrink-0 text-text-light" />
        )}
        <span className="truncate">{entry.name}</span>
        <div style={{
          position: "absolute",
          left: "4px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "2px",
          height: isSelected ? "14px" : "0px",
          borderRadius: "1px",
          background: "var(--color-accent)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </button>

      {isExpanded &&
        children.map((child) => (
          <FileTreeItem key={child.path} entry={child} depth={depth + 1} onHover={onHover} onContextMenu={onContextMenu} />
        ))}
    </div>
  );
}

export function FileTree({ rootPath }: { rootPath: string }) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const { fileTreeVersion, refreshFileTree, closeTab, tabs } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: FileEntry } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FileEntry | null>(null);

  const handleHover = useCallback((el: HTMLButtonElement | null) => {
    if (!el || !containerRef.current) {
      setHighlight(null);
      return;
    }
    const cr = containerRef.current.getBoundingClientRect();
    const br = el.getBoundingClientRect();
    setHighlight({ left: br.left - cr.left, top: br.top - cr.top, width: br.width, height: br.height });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, entry });
  }, []);

  const handleDelete = async (entry: FileEntry) => {
    try {
      await invoke("move_to_trash", { path: entry.path });
      // 열려있는 탭이면 닫기
      const openTab = tabs.find((t) => t.filePath === entry.path);
      if (openTab) closeTab(openTab.id);
      refreshFileTree();
    } catch (err) {
      console.error("삭제 실패:", err);
    }
    setDeleteConfirm(null);
  };

  const getContextMenuItems = (entry: FileEntry): ContextMenuItem[] => {
    return [
      { label: "삭제", onClick: () => setDeleteConfirm(entry), danger: true },
    ];
  };

  useEffect(() => {
    loadDirectory(rootPath).then(setEntries);
  }, [rootPath, fileTreeVersion]);

  return (
    <div
      ref={containerRef}
      className="py-0.5"
      style={{ position: "relative" }}
      onMouseLeave={() => setHighlight(null)}
    >
      {/* 슬라이딩 하이라이트 */}
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

      {entries.length === 0 ? (
        <p className="text-[11px] text-text-light px-3 py-2">빈 폴더</p>
      ) : (
        entries.map((entry) => (
          <FileTreeItem key={entry.path} entry={entry} depth={0} onHover={handleHover} onContextMenu={handleContextMenu} />
        ))
      )}

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.entry)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* 삭제 확인 */}
      {deleteConfirm && (
        <div
          onClick={() => setDeleteConfirm(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            display: "flex", alignItems: "start", justifyContent: "center", paddingTop: "120px",
            background: "rgba(0,0,0,0.35)", animation: "fadeIn 0.15s ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "360px", background: "var(--color-bg-elevated)", borderRadius: "12px",
              border: "1px solid var(--color-border-medium)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              padding: "24px", animation: "fadeIn 0.15s ease-out",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-heading)", marginBottom: "8px" }}>
              {deleteConfirm.isDirectory ? "폴더를 삭제하시겠습니까?" : "파일을 삭제하시겠습니까?"}
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "4px", lineHeight: 1.5 }}>
              <strong>{deleteConfirm.name}</strong>
            </div>
            <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginBottom: "20px", lineHeight: 1.5 }}>
              {deleteConfirm.isDirectory
                ? "폴더와 내부의 모든 파일이 휴지통으로 이동됩니다."
                : "이 파일이 휴지통으로 이동됩니다."}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: "6px 16px", fontSize: "12px", fontWeight: 500,
                  background: "var(--color-bg-hover)", color: "var(--color-text-primary)",
                  border: "none", borderRadius: "6px", cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  padding: "6px 16px", fontSize: "12px", fontWeight: 600,
                  background: "#e53935", color: "#fff",
                  border: "none", borderRadius: "6px", cursor: "pointer",
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
