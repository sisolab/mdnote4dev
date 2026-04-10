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

// 표시된 모든 항목의 flat path 리스트 수집
function collectVisiblePaths(entries: FileEntry[], expandedFolders: Set<string>): string[] {
  const result: string[] = [];
  for (const entry of entries) {
    result.push(entry.path);
    if (entry.isDirectory && expandedFolders.has(entry.path) && entry.children) {
      result.push(...collectVisiblePaths(entry.children, expandedFolders));
    }
  }
  return result;
}

function FileTreeItem({
  entry,
  depth,
  onHover,
  onItemClick,
  onContextMenu,
}: {
  entry: FileEntry;
  depth: number;
  onHover: (el: HTMLButtonElement | null) => void;
  onItemClick: (e: React.MouseEvent, entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}) {
  const { expandedFolders, toggleFolder, selectedFile, openTab, fileTreeVersion, selectedPaths, clearSelectedPaths, setSelectedPaths, tabs } =
    useAppStore();
  const [children, setChildren] = useState<FileEntry[]>([]);
  const isExpanded = expandedFolders.has(entry.path);
  const isFocused = selectedFile === entry.path;
  const isOpened = tabs.some((t) => t.filePath === entry.path);
  const isMultiSelected = selectedPaths.has(entry.path);

  useEffect(() => {
    if (isExpanded && entry.isDirectory) {
      loadDirectory(entry.path).then(setChildren);
    }
  }, [isExpanded, entry.path, entry.isDirectory, fileTreeVersion]);

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.shiftKey) {
      onItemClick(e, entry);
      return;
    }

    // 일반 클릭: 해당 항목만 선택
    onItemClick(e, entry);
    if (entry.isDirectory) {
      toggleFolder(entry.path);
    }
  };

  const handleDoubleClick = async () => {
    if (entry.name.endsWith(".md")) {
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
        data-path={entry.path}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={(e) => onHover(e.currentTarget)}
        onContextMenu={(e) => onContextMenu(e, entry)}
        className={`w-full flex items-center gap-2 text-[14px] relative z-10 ${
          isOpened
            ? "text-accent font-semibold"
            : "text-text-primary"
        } ${!entry.isDirectory && !isMarkdown ? "opacity-30" : ""}`}
        style={{
          paddingLeft: `${depth * 16 + 32}px`, paddingRight: "16px", height: "36px",
          background: isMultiSelected ? "var(--color-accent-subtle)" : "transparent",
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
          width: isFocused ? "12px" : "2px",
          height: isFocused || isOpened ? "16px" : "0px",
          borderRadius: "1px",
          background: "var(--color-accent)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </button>

      {isExpanded &&
        children.map((child) => (
          <FileTreeItem key={child.path} entry={child} depth={depth + 1} onHover={onHover} onItemClick={onItemClick} onContextMenu={onContextMenu} />
        ))}
    </div>
  );
}

export function FileTree({ rootPath }: { rootPath: string }) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const { fileTreeVersion, refreshFileTree, closeTab, tabs, selectedPaths, setSelectedPaths, toggleSelectedPath, clearSelectedPaths } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entries: FileEntry[] } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FileEntry[] | null>(null);
  const lastClickedPath = useRef<string | null>(null);

  const handleHover = useCallback((el: HTMLButtonElement | null) => {
    if (!el || !containerRef.current) {
      setHighlight(null);
      return;
    }
    const cr = containerRef.current.getBoundingClientRect();
    const br = el.getBoundingClientRect();
    setHighlight({ left: br.left - cr.left, top: br.top - cr.top, width: br.width, height: br.height });
  }, []);

  // DOM에서 보이는 항목 path 순서 가져오기
  const getVisiblePaths = useCallback((): string[] => {
    if (!containerRef.current) return [];
    const buttons = containerRef.current.querySelectorAll("button[data-path]");
    return Array.from(buttons).map((b) => (b as HTMLElement).dataset.path!);
  }, []);

  const handleItemClick = useCallback((e: React.MouseEvent, entry: FileEntry) => {
    if (e.ctrlKey) {
      toggleSelectedPath(entry.path);
      lastClickedPath.current = entry.path;
    } else if (e.shiftKey && lastClickedPath.current) {
      const paths = getVisiblePaths();
      const startIdx = paths.indexOf(lastClickedPath.current);
      const endIdx = paths.indexOf(entry.path);
      if (startIdx !== -1 && endIdx !== -1) {
        const from = Math.min(startIdx, endIdx);
        const to = Math.max(startIdx, endIdx);
        const rangePaths = new Set<string>();
        for (let i = from; i <= to; i++) {
          rangePaths.add(paths[i]);
        }
        setSelectedPaths(rangePaths);
      }
      lastClickedPath.current = entry.path;
    } else {
      // 일반 클릭
      setSelectedPaths(new Set([entry.path]));
      lastClickedPath.current = entry.path;
    }
  }, [toggleSelectedPath, setSelectedPaths, getVisiblePaths]);

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    // 우클릭한 항목이 선택 목록에 있으면 선택된 것들 모두, 아니면 그것만
    if (selectedPaths.has(entry.path) && selectedPaths.size > 1) {
      const selected = getVisiblePaths()
        .filter((p) => selectedPaths.has(p))
        .map((p) => {
          const name = p.split("\\").pop() ?? "";
          return { path: p, name, isDirectory: !name.includes(".") } as FileEntry;
        });
      setContextMenu({ x: e.clientX, y: e.clientY, entries: selected });
    } else {
      setContextMenu({ x: e.clientX, y: e.clientY, entries: [entry] });
    }
  }, [selectedPaths]);

  const handleDelete = async (items: FileEntry[]) => {
    try {
      for (const item of items) {
        await invoke("move_to_trash", { path: item.path });
        const openTab = tabs.find((t) => t.filePath === item.path);
        if (openTab) closeTab(openTab.id);
      }
      clearSelectedPaths();
      refreshFileTree();
    } catch (err) {
      console.error("삭제 실패:", err);
    }
    setDeleteConfirm(null);
  };

  const getContextMenuItems = (items: FileEntry[]): ContextMenuItem[] => {
    const label = items.length > 1 ? `${items.length}개 항목 삭제` : "삭제";
    return [
      { label, onClick: () => setDeleteConfirm(items), danger: true },
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
      onClick={(e) => {
        // 빈 공간 클릭 시 선택 해제
        if (!(e.target as HTMLElement).closest("button")) {
          clearSelectedPaths();
        }
      }}
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
          <FileTreeItem key={entry.path} entry={entry} depth={0} onHover={handleHover} onItemClick={handleItemClick} onContextMenu={handleContextMenu} />
        ))
      )}

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.entries)}
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
              {deleteConfirm.length > 1
                ? `${deleteConfirm.length}개 항목을 삭제하시겠습니까?`
                : deleteConfirm[0].isDirectory ? "폴더를 삭제하시겠습니까?" : "파일을 삭제하시겠습니까?"}
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "4px", lineHeight: 1.6 }}>
              {deleteConfirm.length > 1
                ? deleteConfirm.map((e) => e.name).join(", ")
                : <strong>{deleteConfirm[0].name}</strong>}
            </div>
            <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginBottom: "20px", lineHeight: 1.5 }}>
              {deleteConfirm.length > 1
                ? "선택한 항목들이 휴지통으로 이동됩니다."
                : deleteConfirm[0].isDirectory
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
