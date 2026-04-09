import { useEffect, useState } from "react";
import { readDir } from "@tauri-apps/plugin-fs";
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

function FileTreeItem({ entry, depth }: { entry: FileEntry; depth: number }) {
  const { expandedFolders, toggleFolder, selectedFile, setSelectedFile } =
    useAppStore();
  const [children, setChildren] = useState<FileEntry[]>([]);
  const isExpanded = expandedFolders.has(entry.path);
  const isSelected = selectedFile === entry.path;

  useEffect(() => {
    if (isExpanded && entry.isDirectory) {
      loadDirectory(entry.path).then(setChildren);
    }
  }, [isExpanded, entry.path, entry.isDirectory]);

  const handleClick = () => {
    if (entry.isDirectory) {
      toggleFolder(entry.path);
    } else if (entry.name.endsWith(".md")) {
      setSelectedFile(entry.path);
    }
  };

  const isMarkdown = entry.name.endsWith(".md");

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-1.5 py-1 px-2 rounded-md text-sm transition-colors ${
          isSelected
            ? "bg-accent-subtle text-accent"
            : "hover:bg-bg-hover text-text-primary"
        } ${!entry.isDirectory && !isMarkdown ? "opacity-50" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* 아이콘 */}
        {entry.isDirectory ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          >
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-text-tertiary"
          >
            <path
              d="M9 2H4.5A1.5 1.5 0 003 3.5v9A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V6L9 2z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        <span className="truncate">{entry.name}</span>
      </button>

      {isExpanded &&
        children.map((child) => (
          <FileTreeItem key={child.path} entry={child} depth={depth + 1} />
        ))}
    </div>
  );
}

export function FileTree({ rootPath }: { rootPath: string }) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const { expandedFolders } = useAppStore();

  useEffect(() => {
    loadDirectory(rootPath).then(setEntries);
  }, [rootPath]);

  // 루트가 펼쳐질 때 다시 로드
  useEffect(() => {
    if (expandedFolders.has(rootPath)) {
      loadDirectory(rootPath).then(setEntries);
    }
  }, [expandedFolders, rootPath]);

  return (
    <div className="py-1">
      {entries.length === 0 ? (
        <p className="text-xs text-text-tertiary px-3 py-2">빈 폴더</p>
      ) : (
        entries.map((entry) => (
          <FileTreeItem key={entry.path} entry={entry} depth={0} />
        ))
      )}
    </div>
  );
}
