import { useEffect, useState, useRef, useCallback } from "react";
import { readDir, readTextFile, rename, mkdir, create } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, type FileEntry } from "@/stores/appStore";
import { ChevronRight, FileText } from "lucide-react";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";

async function loadDirectory(path: string): Promise<FileEntry[]> {
  try {
    const { folderSort } = useAppStore.getState();
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
        if (folderSort === "name") return a.name.localeCompare(b.name);
        return 0; // date-added/custom = 파일시스템 순서
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
  onItemClick,
  onContextMenu,
  renamingPath,
  renameValue,
  setRenameValue,
  onFinishRename,
  searchMode,
}: {
  entry: FileEntry;
  depth: number;
  onHover: (el: HTMLButtonElement | null) => void;
  onItemClick: (e: React.MouseEvent, entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  renamingPath: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onFinishRename: (entry: FileEntry) => void;
  searchMode?: boolean;
}) {
  const { expandedFolders, toggleFolder, selectedFile, openTab, fileTreeVersion, selectedPaths, tabs } =
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
            className={`shrink-0 transition-transform duration-[0.15s] text-text-light ${(searchMode || isExpanded) ? "rotate-90" : ""}`}
          />
        ) : (
          <FileText size={13} className="shrink-0 text-text-light" />
        )}
        {renamingPath === entry.path ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => onFinishRename(entry)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onFinishRename(entry);
              if (e.key === "Escape") { setRenameValue(""); onFinishRename(entry); }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: "14px", fontWeight: 500, color: "var(--color-accent)",
              background: "transparent", border: "none", borderBottom: "1px solid var(--color-accent)",
              borderRadius: "0", padding: "0", outline: "none", width: "100%",
            }}
          />
        ) : (
          <span className="truncate">{entry.name}</span>
        )}
        {/* 포커스 인디케이터 */}
        <div style={{
          position: "absolute", left: "4px", top: "50%", transform: "translateY(-50%)",
          width: "2px",
          height: isFocused ? "16px" : "0px",
          borderRadius: "1px",
          background: "var(--color-accent)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </button>

      {(searchMode ? entry.isDirectory : isExpanded) &&
        (searchMode ? entry.children ?? [] : children).map((child) => (
          <FileTreeItem key={child.path} entry={child} depth={depth + 1} onHover={onHover} onItemClick={onItemClick} onContextMenu={onContextMenu} renamingPath={renamingPath} renameValue={renameValue} setRenameValue={setRenameValue} onFinishRename={onFinishRename} searchMode={searchMode} />
        ))}
    </div>
  );
}

async function filterTree(path: string, query: string): Promise<FileEntry[]> {
  const entries = await loadDirectory(path);
  const results: FileEntry[] = [];
  for (const entry of entries) {
    if (entry.isDirectory) {
      const children = await filterTree(entry.path, query);
      if (children.length > 0) {
        results.push({ ...entry, children });
      }
    } else if (entry.name.toLowerCase().includes(query)) {
      results.push(entry);
    }
  }
  return results;
}

export function FileTree({ rootPath, searchQuery = "" }: { rootPath: string; searchQuery?: string }) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [searchResults, setSearchResults] = useState<FileEntry[]>([]);
  const { fileTreeVersion, refreshFileTree, closeTab, tabs, selectedPaths, setSelectedPaths, toggleSelectedPath, clearSelectedPaths, openTab, expandedFolders, toggleFolder } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entries: FileEntry[] } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FileEntry[] | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const lastClickedPath = useRef<string | null>(null);

  const startRename = (entry: FileEntry) => {
    setRenamingPath(entry.path);
    const nameWithoutExt = entry.isDirectory ? entry.name : entry.name.replace(/\.[^.]+$/, "");
    setRenameValue(nameWithoutExt);
  };

  const finishRename = async (entry: FileEntry) => {
    if (!renameValue.trim() || !renamingPath) {
      setRenamingPath(null);
      return;
    }
    const ext = entry.isDirectory ? "" : (entry.name.match(/\.[^.]+$/) ?? [""])[0];
    const newName = renameValue.trim() + ext;
    const parentPath = entry.path.substring(0, entry.path.lastIndexOf("\\"));
    const newPath = `${parentPath}\\${newName}`;

    if (newPath === entry.path) {
      setRenamingPath(null);
      return;
    }

    try {
      await rename(entry.path, newPath);
      const state = useAppStore.getState();
      // 열려있는 탭 경로 업데이트
      const openTab = tabs.find((t) => t.filePath === entry.path);
      if (openTab) {
        state.updateTabFilePath(openTab.id, newPath, newName);
      }
      // 문서 섹션 경로 업데이트
      if (state.standaloneFiles.includes(entry.path)) {
        state.removeStandaloneFile(entry.path);
        state.addStandaloneFile(newPath);
      }
      refreshFileTree();
    } catch (err) {
      console.error("이름 변경 실패:", err);
    }
    setRenamingPath(null);
  };

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
      const { removeStandaloneFile } = useAppStore.getState();
      for (const item of items) {
        await invoke("move_to_trash", { path: item.path });
        const openTab = tabs.find((t) => t.filePath === item.path);
        if (openTab) closeTab(openTab.id);
        removeStandaloneFile(item.path);
      }
      clearSelectedPaths();
      refreshFileTree();
    } catch (err) {
      console.error("삭제 실패:", err);
    }
    setDeleteConfirm(null);
  };

  const handleNewFile = async (folderPath: string) => {
    try {
      let name = "제목 없음.md";
      let i = 1;
      while (await readDir(folderPath).then((entries) => entries.some((e) => e.name === name)).catch(() => false)) {
        name = `제목 없음 ${i}.md`;
        i++;
      }
      const filePath = `${folderPath}\\${name}`;
      const content = "# " + name.replace(/\.md$/, "") + "\n";
      const file = await create(filePath);
      await file.write(new TextEncoder().encode(content));
      await file.close();
      if (!expandedFolders.has(folderPath)) toggleFolder(folderPath);
      refreshFileTree();
      openTab(filePath, name, content);
    } catch (err) {
      console.error("새 문서 생성 실패:", err);
    }
  };

  const handleNewFolder = async (folderPath: string) => {
    try {
      let name = "새 폴더";
      let i = 1;
      while (await readDir(folderPath).then((entries) => entries.some((e) => e.name === name)).catch(() => false)) {
        name = `새 폴더 ${i}`;
        i++;
      }
      await mkdir(`${folderPath}\\${name}`);
      if (!expandedFolders.has(folderPath)) toggleFolder(folderPath);
      refreshFileTree();
    } catch (err) {
      console.error("새 폴더 생성 실패:", err);
    }
  };

  const getContextMenuItems = (items: FileEntry[]): ContextMenuItem[] => {
    if (items.length > 1) {
      return [
        { label: `${items.length}개 항목 삭제`, onClick: () => setDeleteConfirm(items), danger: true },
      ];
    }
    const entry = items[0];
    if (entry.isDirectory) {
      return [
        { label: "새 문서", onClick: () => handleNewFile(entry.path) },
        { label: "새 폴더", onClick: () => handleNewFolder(entry.path) },
        { divider: true, label: "", onClick: () => {} },
        { label: "이름 바꾸기", onClick: () => startRename(entry) },
        { divider: true, label: "", onClick: () => {} },
        { label: "삭제", onClick: () => setDeleteConfirm(items), danger: true },
      ];
    }
    return [
      { label: "이름 바꾸기", onClick: () => startRename(entry) },
      { divider: true, label: "", onClick: () => {} },
      { label: "삭제", onClick: () => setDeleteConfirm(items), danger: true },
    ];
  };

  useEffect(() => {
    loadDirectory(rootPath).then(setEntries);
  }, [rootPath, fileTreeVersion]);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    if (q) {
      filterTree(rootPath, q).then(setSearchResults);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, rootPath, fileTreeVersion]);

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

      {(() => {
        const items = searchQuery ? searchResults : entries;
        if (searchQuery && items.length === 0) return null;
        return items.length === 0 ? (
          <p className="text-[11px] text-text-light px-3 py-2">빈 폴더</p>
        ) : (
          items.map((entry) => (
            <FileTreeItem key={entry.path} entry={entry} depth={0} onHover={handleHover} onItemClick={handleItemClick} onContextMenu={handleContextMenu} renamingPath={renamingPath} renameValue={renameValue} setRenameValue={setRenameValue} onFinishRename={finishRename} searchMode={!!searchQuery} />
          ))
        );
      })()}

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
