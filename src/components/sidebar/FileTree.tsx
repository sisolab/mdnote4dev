import { useEffect, useState, useRef, useCallback } from "react";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { useAppStore, type FileEntry } from "@/stores/appStore";

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
}: {
  entry: FileEntry;
  depth: number;
  onHover: (el: HTMLButtonElement | null) => void;
}) {
  const { expandedFolders, toggleFolder, selectedFile, openTab } =
    useAppStore();
  const [children, setChildren] = useState<FileEntry[]>([]);
  const isExpanded = expandedFolders.has(entry.path);
  const isSelected = selectedFile === entry.path;

  useEffect(() => {
    if (isExpanded && entry.isDirectory) {
      loadDirectory(entry.path).then(setChildren);
    }
  }, [isExpanded, entry.path, entry.isDirectory]);

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
        className={`w-full flex items-center gap-2 text-[14px] relative z-10 ${
          isSelected
            ? "text-accent font-semibold"
            : "text-text-primary"
        } ${!entry.isDirectory && !isMarkdown ? "opacity-30" : ""}`}
        style={{
          paddingLeft: `${depth * 16 + 32}px`, paddingRight: "12px", height: "34px",
        }}
      >
        {entry.isDirectory ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
            className={`shrink-0 transition-transform duration-[0.15s] text-text-light ${isExpanded ? "rotate-90" : ""}`}
          >
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-light">
            <path d="M9 2H4.5A1.5 1.5 0 003 3.5v9A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V6L9 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="truncate">{entry.name}</span>
        {/* 미니멀 좌측 인디케이터 */}
        <div style={{
          position: "absolute",
          left: "4px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "2px",
          height: isSelected ? "14px" : "0px",
          borderRadius: "1px",
          background: "#1a73e8",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </button>

      {isExpanded &&
        children.map((child) => (
          <FileTreeItem key={child.path} entry={child} depth={depth + 1} onHover={onHover} />
        ))}
    </div>
  );
}

export function FileTree({ rootPath }: { rootPath: string }) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const { expandedFolders } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const handleHover = useCallback((el: HTMLButtonElement | null) => {
    if (!el || !containerRef.current) {
      setHighlight(null);
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const btnRect = el.getBoundingClientRect();
    setHighlight({
      left: btnRect.left - containerRect.left,
      top: btnRect.top - containerRect.top,
      width: btnRect.width,
      height: btnRect.height,
    });
  }, []);

  useEffect(() => {
    loadDirectory(rootPath).then(setEntries);
  }, [rootPath]);

  useEffect(() => {
    if (expandedFolders.has(rootPath)) {
      loadDirectory(rootPath).then(setEntries);
    }
  }, [expandedFolders, rootPath]);

  return (
    <div
      ref={containerRef}
      className="py-0.5"
      style={{ position: "relative" }}
      onMouseLeave={() => setHighlight(null)}
    >
      {/* 슬라이딩 하이라이트 */}
      <div
        style={{
          position: "absolute",
          left: highlight ? `${highlight.left}px` : 0,
          top: highlight ? `${highlight.top}px` : 0,
          width: highlight ? `${highlight.width}px` : 0,
          height: highlight ? `${highlight.height}px` : 0,
          background: "#eef1f5",
          borderRadius: "3px",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: highlight ? 1 : 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {entries.length === 0 ? (
        <p className="text-[11px] text-text-light px-3 py-2">빈 폴더</p>
      ) : (
        entries.map((entry) => (
          <FileTreeItem key={entry.path} entry={entry} depth={0} onHover={handleHover} />
        ))
      )}
    </div>
  );
}
