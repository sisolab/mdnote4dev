import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { readDir, readTextFile, rename, mkdir, create } from "@tauri-apps/plugin-fs";
import { deleteDocImages, renameDocImages } from "@/utils/imageUtils";
import { invoke } from "@tauri-apps/api/core";
import { executeUndoable, useUndoStore } from "@/stores/undoStore";
import { moveToTrash, restoreFromTrash, findFavoriteRoot } from "@/utils/trashUtils";
import { moveItems, undoMoveItems } from "@/utils/fileOps";
import { useAppStore, type FileEntry } from "@/stores/appStore";
import { ChevronRight, FileText, Star, Folder } from "lucide-react";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";

async function loadDirectory(path: string): Promise<FileEntry[]> {
  try {
    const { folderSort, customFileOrder } = useAppStore.getState();
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
        if (folderSort === "custom") {
          const order = customFileOrder[path];
          if (order) {
            const ai = order.indexOf(a.name);
            const bi = order.indexOf(b.name);
            // 순서에 없는 항목은 뒤로
            const aIdx = ai >= 0 ? ai : 9999;
            const bIdx = bi >= 0 ? bi : 9999;
            return aIdx - bIdx;
          }
        }
        return 0;
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
  compact,
  onDragStart,
  onDragOverFolder,
  dragPaths,
  dropTargetPath,
  reorderTarget: reorderTargetProp,
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
  compact?: boolean;
  onDragStart?: (e: React.MouseEvent, entry: FileEntry) => void;
  onDragOverFolder?: (e: React.MouseEvent, folderPath: string) => void;
  dragPaths?: string[] | null;
  dropTargetPath?: string | null;
  reorderTarget?: { path: string; pos: "above" | "below" } | null;
}) {
  const { expandedFolders, toggleFolder, selectedFile, openTab, fileTreeVersion, selectedPaths, tabs, favoriteFiles } =
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
  const rt = reorderTargetProp;
  const isRtTarget = rt?.path === entry.path && !dragPaths?.includes(entry.path);
  const showReorderTop = isRtTarget && rt?.pos === "above";
  const showReorderLine = isRtTarget && rt?.pos === "below";

  return (
    <div>
      {showReorderTop && <div style={{ height: "3px", background: "var(--color-accent)", margin: "0 16px", borderRadius: "2px" }} />}
      <button
        data-path={entry.path}
        data-is-dir={String(!!entry.isDirectory)}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={(e) => { onHover(e.currentTarget); if (entry.isDirectory && onDragOverFolder) onDragOverFolder(e, entry.path); }}
        onMouseMove={(e) => { if (entry.isDirectory && onDragOverFolder) onDragOverFolder(e, entry.path); }}
        onMouseDown={(e) => { if (onDragStart && !renamingPath) onDragStart(e, entry); }}
        onContextMenu={(e) => onContextMenu(e, entry)}
        className={`w-full flex items-center gap-2 text-[14px] relative z-10 ${
          isOpened
            ? "text-accent"
            : "text-text-primary"
        } ${!entry.isDirectory && !isMarkdown ? "opacity-30" : ""}`}
        style={{
          paddingLeft: `${depth * 16 + 32}px`, paddingRight: "16px", height: compact ? "22px" : "30px",
          fontSize: compact ? "11px" : "13px",
          background: isMultiSelected ? "var(--color-accent-subtle)" : "transparent",
          opacity: dragPaths?.includes(entry.path) ? 0.4 : 1,
        }}
      >
        {entry.isDirectory ? (
          <>
          <ChevronRight
            size={12}
            className={`shrink-0 transition-transform duration-[0.15s] text-text-light ${(searchMode || isExpanded) ? "rotate-90" : ""}`}
          />
          <Folder size={13} className="shrink-0" style={{ color: "var(--color-text-light)" }} />
          </>
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
          <>
          <span className="truncate">{entry.name}</span>
          {!entry.isDirectory && favoriteFiles.includes(entry.path) && (
            <Star size={11} className="shrink-0" style={{ color: "#f5c518", fill: "#f5c518" }} />
          )}
          </>
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
      {showReorderLine && <div style={{ height: "3px", background: "var(--color-accent)", margin: "0 16px", borderRadius: "2px" }} />}

      {(searchMode ? entry.isDirectory : isExpanded) &&
        (searchMode ? entry.children ?? [] : children).map((child) => (
          <FileTreeItem key={child.path} entry={child} depth={depth + 1} onHover={onHover} onItemClick={onItemClick} onContextMenu={onContextMenu} renamingPath={renamingPath} renameValue={renameValue} setRenameValue={setRenameValue} onFinishRename={onFinishRename} searchMode={searchMode} compact={compact} onDragStart={onDragStart} onDragOverFolder={onDragOverFolder} dragPaths={dragPaths} dropTargetPath={dropTargetPath} reorderTarget={reorderTargetProp} />
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

export function FileTree({ rootPath, searchQuery = "", compact = false }: { rootPath: string; searchQuery?: string; compact?: boolean }) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [searchResults, setSearchResults] = useState<FileEntry[]>([]);
  const { fileTreeVersion, refreshFileTree, closeTab, tabs, selectedPaths, setSelectedPaths, toggleSelectedPath, clearSelectedPaths, openTab, expandedFolders, toggleFolder } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  // ── 파일/폴더 드래그 이동 + 리오더 ──
  const [dragMovePaths, setDragMovePaths] = useState<string[] | null>(null);
  const [reorderTarget, setReorderTarget] = useState<{ path: string; pos: "above" | "below" } | null>(null);
  const reorderTargetRef = useRef<{ path: string; pos: "above" | "below" } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragMoveState = useRef<{ startY: number; active: boolean; paths: string[] }>({ startY: 0, active: false, paths: [] });
  const dropTargetRef = useRef<string | null>(null);

  const dragGhostRef = useRef<HTMLDivElement | null>(null);

  const createDragGhost = (entry: FileEntry, count: number, x: number, y: number) => {
    // 원본 행을 복제해서 고스트로 사용
    const srcBtn = document.querySelector(`[data-path="${CSS.escape(entry.path)}"]`) as HTMLElement | null;
    const ghost = document.createElement("div");
    if (srcBtn) {
      const clone = srcBtn.cloneNode(true) as HTMLElement;
      clone.style.position = "static";
      clone.style.background = "var(--color-bg-elevated)";
      clone.style.border = "1px solid var(--color-border-medium)";
      clone.style.borderRadius = "4px";
      clone.style.width = `${srcBtn.offsetWidth}px`;
      clone.style.opacity = "1";
      ghost.appendChild(clone);
      if (count > 1) {
        const badge = document.createElement("div");
        badge.style.cssText = `
          position: absolute; top: -6px; right: -6px;
          background: var(--color-accent); color: #fff;
          font-size: 10px; font-weight: 600; border-radius: 8px;
          padding: 1px 5px; min-width: 16px; text-align: center;
        `;
        badge.textContent = String(count);
        ghost.appendChild(badge);
      }
    }
    ghost.style.cssText = `
      position: fixed; pointer-events: none; z-index: 9999;
      opacity: 0.75; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      border-radius: 4px;
      left: ${x + 8}px; top: ${y - 4}px;
    `;
    document.body.appendChild(ghost);
    dragGhostRef.current = ghost;
  };

  const moveDragGhost = (x: number, y: number) => {
    if (dragGhostRef.current) {
      dragGhostRef.current.style.left = `${x + 12}px`;
      dragGhostRef.current.style.top = `${y - 10}px`;
    }
  };

  const removeDragGhost = () => {
    if (dragGhostRef.current) {
      dragGhostRef.current.remove();
      dragGhostRef.current = null;
    }
  };

  const startItemDrag = (e: React.MouseEvent, entry: FileEntry) => {
    if (e.button !== 0) return;
    // Ctrl/Shift 클릭은 선택용 — 드래그 시작 안 함
    if (e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const paths = selectedPaths.has(entry.path) ? [...selectedPaths] : [entry.path];
    const startY = e.clientY;
    dragMoveState.current = { startY, active: false, paths };

    const onMove = (me: MouseEvent) => {
      me.preventDefault();
      if (!dragMoveState.current.active && Math.abs(me.clientY - dragMoveState.current.startY) > 5) {
        dragMoveState.current.active = true;
        setDragMovePaths(dragMoveState.current.paths);
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
        createDragGhost(entry, paths.length, me.clientX, me.clientY);
      }
      moveDragGhost(me.clientX, me.clientY);
      // 드래그 중 폴더 위 감지 (elementFromPoint)
      if (dragMoveState.current.active) {
        const el = document.elementFromPoint(me.clientX, me.clientY);
        const btn = el?.closest("[data-path]") as HTMLElement | null;
        const path = btn?.dataset.path;
        const isDir = btn?.dataset.isDir === "true";

        let target: string | null = null;
        if (path && isDir) {
          // 폴더 위 → 그 폴더로 이동
          target = path;
        } else if (path && !isDir) {
          // 파일 위 → 파일의 부모 폴더로 이동
          target = path.substring(0, path.lastIndexOf("\\"));
        } else {
          // 빈 공간 → 가장 가까운 FileTree 루트 폴더 찾기
          const treeRoot = el?.closest("[data-tree-root]") as HTMLElement | null;
          if (treeRoot?.dataset.treeRoot) {
            target = treeRoot.dataset.treeRoot;
          }
        }

        // 드래그 중인 파일의 현재 폴더와 같으면 → 리오더 모드 (custom 정렬일 때만)
        const dragDir = dragMoveState.current.paths[0]?.substring(0, dragMoveState.current.paths[0].lastIndexOf("\\"));
        const { folderSort } = useAppStore.getState();
        if (target === dragDir && path && !isDir && folderSort === "custom") {
          // 같은 폴더 내 파일 위 → 리오더
          const rect = btn!.getBoundingClientRect();
          const pos = me.clientY < rect.top + rect.height / 2 ? "above" : "below";
          reorderTargetRef.current = { path, pos };
          setReorderTarget({ path, pos });
          target = null; // 폴더 이동은 아님
        } else {
          reorderTargetRef.current = null;
          setReorderTarget(null);
          if (target === dragDir) target = null;
        }

        // 이전 하이라이트 제거
        document.querySelectorAll("[data-drop-active]").forEach((el) => {
          (el as HTMLElement).removeAttribute("data-drop-active");
        });
        // 새 하이라이트 설정 (해당 폴더 전체 영역)
        if (target) {
          // data-tree-root가 target인 컨테이너 또는 data-path가 target인 폴더 div
          const treeEl = document.querySelector(`[data-tree-root="${CSS.escape(target)}"]`);
          if (treeEl) (treeEl as HTMLElement).setAttribute("data-drop-active", "true");
          // 서브폴더의 wrapper div (FileTreeItem의 최상위 div)
          const folderBtn = document.querySelector(`[data-path="${CSS.escape(target)}"][data-is-dir="true"]`);
          const folderWrapper = folderBtn?.closest("div:not([data-tree-root])");
          if (folderWrapper && folderWrapper !== treeEl) (folderWrapper as HTMLElement).setAttribute("data-drop-active", "true");
        }

        dropTargetRef.current = target;
        setDropTarget(target);
      }
    };

    const onUp = async () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      const s = dragMoveState.current;

      if (!s.active) {
        // 드래그 안 됨 → 클릭 이벤트 발생시킴
        const btn = document.querySelector(`[data-path="${CSS.escape(entry.path)}"]`) as HTMLElement;
        if (btn) btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        cleanup();
        return;
      }

      // 같은 폴더 내 리오더
      const rt = reorderTargetRef.current;
      if (s.active && rt && s.paths.length === 1) {
        const dragPath = s.paths[0];
        const dragName = dragPath.split("\\").pop() ?? "";
        const targetName = rt.path.split("\\").pop() ?? "";
        const folderPath = dragPath.substring(0, dragPath.lastIndexOf("\\"));
        const { customFileOrder, setCustomFileOrder } = useAppStore.getState();

        // 현재 순서 가져오기 (없으면 현재 표시 순서로 초기화)
        let order = customFileOrder[folderPath] ? [...customFileOrder[folderPath]] : entries.map((e) => e.name);
        // 순서에 없는 항목 추가 (새 파일 등)
        if (!order.includes(dragName)) order.push(dragName);
        if (!order.includes(targetName)) order.push(targetName);
        // 드래그 항목 제거
        const fromIdx = order.indexOf(dragName);
        order.splice(fromIdx, 1);
        // 삽입 위치 계산
        let toIdx = order.indexOf(targetName);
        if (toIdx < 0) toIdx = order.length;
        if (rt.pos === "below") toIdx++;
        if (toIdx > order.length) toIdx = order.length;
        order.splice(toIdx, 0, dragName);

        const oldOrder = customFileOrder[folderPath] ? [...customFileOrder[folderPath]] : entries.map((e) => e.name);
        const newOrder = [...order];

        // FLIP: 위치 캡처
        const flipPositions: Record<string, number> = {};
        if (containerRef.current) {
          containerRef.current.querySelectorAll("[data-path]").forEach((el) => {
            const p = (el as HTMLElement).dataset.path!;
            flipPositions[p] = el.getBoundingClientRect().top;
          });
        }

        executeUndoable({
          type: "reorder-files",
          description: `파일 순서 변경: ${dragName}`,
          execute: async () => {
            setCustomFileOrder(folderPath, newOrder);
            refreshFileTree();
            // FLIP 애니메이션
            requestAnimationFrame(() => requestAnimationFrame(() => {
              if (!containerRef.current) return;
              containerRef.current.querySelectorAll("[data-path]").forEach((el) => {
                const p = (el as HTMLElement).dataset.path!;
                const oldTop = flipPositions[p];
                if (oldTop === undefined) return;
                const newTop = el.getBoundingClientRect().top;
                const delta = oldTop - newTop;
                if (Math.abs(delta) < 1) return;
                const htmlEl = el as HTMLElement;
                htmlEl.style.transform = `translateY(${delta}px)`;
                htmlEl.style.transition = "none";
                requestAnimationFrame(() => {
                  const dur = Math.min(0.8, Math.max(0.3, Math.abs(delta) * 0.004));
                  htmlEl.style.transition = `transform ${dur}s cubic-bezier(0.25, 0.1, 0.25, 1)`;
                  htmlEl.style.transform = "translateY(0)";
                  setTimeout(() => { htmlEl.style.transition = ""; htmlEl.style.transform = ""; }, dur * 1000 + 20);
                });
              });
            }));
          },
          undo: async () => { setCustomFileOrder(folderPath, oldOrder); refreshFileTree(); },
        });
        cleanup();
        return;
      }

      const target = dropTargetRef.current;
      if (target) {
        const itemPaths = s.paths;
        if (!itemPaths.includes(target)) {
          // 고스트 부드럽게 사라짐
          const ghost = dragGhostRef.current;
          if (ghost) {
            ghost.style.transition = "opacity 0.3s ease";
            ghost.style.opacity = "0";
            await new Promise((r) => setTimeout(r, 300));
          }
          removeDragGhost();
          document.querySelectorAll("[data-drop-active]").forEach((el) => {
            (el as HTMLElement).removeAttribute("data-drop-active");
          });
          dropTargetRef.current = null;
          setDropTarget(null);
          setDragMovePaths(null);

          if (itemPaths.length > 1) {
            setMoveConfirm({ paths: itemPaths, target });
          } else {
            await doMove(itemPaths, target);
            // 이동 후 새 위치 하이라이트
            setTimeout(() => {
              for (const p of itemPaths) {
                const name = p.split("\\").pop() ?? "";
                const newPath = `${target}\\${name}`;
                const el = document.querySelector(`[data-path="${CSS.escape(newPath)}"]`) as HTMLElement;
                if (el) {
                  el.style.transition = "none";
                  el.style.background = "var(--color-accent-subtle)";
                  requestAnimationFrame(() => {
                    el.style.transition = "background 1.5s ease";
                    el.style.background = "";
                  });
                }
              }
            }, 100);
          }
          dragMoveState.current = { startY: 0, active: false, paths: [] };
          return;
        }
      }
      cleanup();
    };

    const cleanup = () => {
      dragMoveState.current = { startY: 0, active: false, paths: [] };
      dropTargetRef.current = null;
      setDragMovePaths(null);
      setDropTarget(null);
      reorderTargetRef.current = null;
      setReorderTarget(null);
      removeDragGhost();
      document.querySelectorAll("[data-drop-active]").forEach((el) => {
        (el as HTMLElement).removeAttribute("data-drop-active");
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const [moveConfirm, setMoveConfirm] = useState<{ paths: string[]; target: string } | null>(null);

  const doMove = async (paths: string[], target: string) => {
    try {
      const result = await moveItems(paths, target);
      if (result.oldPaths.length > 0) {
        const old = [...result.oldPaths];
        const nw = [...result.newPaths];
        useUndoStore.getState().push({
          type: "move",
          description: old.length > 1 ? `${old.length}개 항목 이동` : `이동: ${old[0].split("\\").pop()}`,
          execute: async () => { await moveItems(old, target); refreshFileTree(); },
          undo: async () => { await undoMoveItems(old, nw); refreshFileTree(); },
        });
      }
      refreshFileTree();
    } catch (err) {
      console.error("이동 실패:", err);
    }
  };

  const updateDropTarget = (e: React.MouseEvent, folderPath: string) => {
    if (!dragMoveState.current.active) return;
    dropTargetRef.current = folderPath;
    setDropTarget(folderPath);
  };
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

    const oldPath = entry.path;
    const oldName = entry.name;

    const doRename = async (from: string, to: string, fromName: string, toName: string) => {
      // 이미지 파일명 변경
      if (!entry.isDirectory && /\.(md|markdown)$/i.test(fromName)) {
        const oldDoc = fromName.replace(/\.(md|markdown)$/i, "");
        const newDoc = toName.replace(/\.(md|markdown)$/i, "");
        if (oldDoc !== newDoc) {
          const state = useAppStore.getState();
          const openTab = state.tabs.find((t) => t.filePath === from);
          const content = openTab?.content ?? "";
          const { writeTextFile } = await import("@tauri-apps/plugin-fs");
          const updated = await renameDocImages(parentPath, oldDoc, newDoc, content);
          if (openTab && updated !== content) {
            state.updateTabContent(openTab.id, updated);
            await writeTextFile(from, updated);
          }
        }
      }
      await rename(from, to);
      const state = useAppStore.getState();
      const openTab = state.tabs.find((t) => t.filePath === from);
      if (openTab) state.updateTabFilePath(openTab.id, to, toName);
      if (state.favoriteFiles.includes(from)) {
        state.removeFavoriteFile(from);
        state.addFavoriteFile(to);
      }
      refreshFileTree();
    };

    try {
      await executeUndoable({
        type: "rename",
        description: `이름 변경: ${oldName} → ${newName}`,
        execute: () => doRename(oldPath, newPath, oldName, newName),
        undo: () => doRename(newPath, oldPath, newName, oldName),
      });
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
      const state = useAppStore.getState();
      const favRoot = findFavoriteRoot(items[0].path, state.favorites);
      if (!favRoot) return;

      let trashRecords: { trashPath: string; originalPath: string }[] = [];
      const closedTabs: { id: string; filePath: string; title: string; content: string }[] = [];

      const doDelete = async () => {
        trashRecords = [];
        const currentState = useAppStore.getState();
        for (const item of items) {
          const record = await moveToTrash(item.path, favRoot);
          trashRecords.push(record);
          const openTab = currentState.tabs.find((t) => t.filePath === item.path);
          if (openTab) {
            closedTabs.push({ id: openTab.id, filePath: openTab.filePath!, title: openTab.title, content: openTab.content });
            closeTab(openTab.id);
          }
          currentState.removeFavoriteFile(item.path);
        }
        clearSelectedPaths();
        refreshFileTree();
      };

      const doRestore = async () => {
        for (const record of trashRecords) {
          await restoreFromTrash(record.trashPath, record.originalPath);
        }
        for (const tab of closedTabs) {
          useAppStore.getState().openTab(tab.filePath, tab.title, tab.content);
        }
        refreshFileTree();
      };

      await executeUndoable({
        type: "delete",
        description: items.length > 1 ? `${items.length}개 항목 삭제` : `삭제: ${items[0].name}`,
        execute: doDelete,
        undo: doRestore,
      });
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
      const content = "";
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

  const handleDuplicateFile = async (entry: FileEntry) => {
    try {
      const dir = entry.path.substring(0, entry.path.lastIndexOf("\\"));
      const ext = entry.name.match(/\.[^.]+$/)?.[0] ?? "";
      const baseName = entry.name.replace(/\.[^.]+$/, "");
      let name = `${baseName} 복사${ext}`;
      let i = 1;
      while (await readDir(dir).then((entries) => entries.some((e) => e.name === name)).catch(() => false)) {
        name = `${baseName} 복사 ${i}${ext}`;
        i++;
      }
      const content = await readTextFile(entry.path);
      const newPath = `${dir}\\${name}`;
      const file = await create(newPath);
      await file.write(new TextEncoder().encode(content));
      await file.close();
      refreshFileTree();
      openTab(newPath, name, content);
    } catch (err) {
      console.error("복제 실패:", err);
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
        { label: `${items.length}개 항목 삭제`, onClick: () => setDeleteConfirm(items), danger: true },  /* 멀티 삭제는 확인창 */
      ];
    }
    const entry = items[0];
    if (entry.isDirectory) {
      return [
        { label: "새 문서", onClick: () => handleNewFile(entry.path) },
        { label: "새 폴더", onClick: () => handleNewFolder(entry.path) },
        { divider: true, label: "", onClick: () => {} },
        { label: "경로 복사", onClick: () => navigator.clipboard.writeText(entry.path) },
        { label: "이름 바꾸기", onClick: () => startRename(entry) },
        { divider: true, label: "", onClick: () => {} },
        { label: "삭제", onClick: () => handleDelete(items), danger: true },
      ];
    }
    const { favoriteFiles: favFiles, addFavoriteFile: addFav, removeFavoriteFile: removeFav } = useAppStore.getState();
    const isFav = favFiles.includes(entry.path);
    return [
      { label: isFav ? "즐겨찾기 해제" : "즐겨찾기 등록", onClick: () => isFav ? removeFav(entry.path) : addFav(entry.path) },
      { divider: true, label: "", onClick: () => {} },
      { label: "경로 복사", onClick: () => navigator.clipboard.writeText(entry.path) },
      { label: "복제", onClick: () => handleDuplicateFile(entry) },
      { label: "이름 바꾸기", onClick: () => startRename(entry) },
      { divider: true, label: "", onClick: () => {} },
      { label: "삭제", onClick: () => handleDelete(items), danger: true },
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
      data-tree-root={rootPath}
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
            <FileTreeItem key={entry.path} entry={entry} depth={0} onHover={handleHover} onItemClick={handleItemClick} onContextMenu={handleContextMenu} renamingPath={renamingPath} renameValue={renameValue} setRenameValue={setRenameValue} onFinishRename={finishRename} searchMode={!!searchQuery} compact={compact} onDragStart={startItemDrag} onDragOverFolder={updateDropTarget} dragPaths={dragMovePaths} dropTargetPath={dropTarget} reorderTarget={reorderTarget} />
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
      {deleteConfirm && createPortal(
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
        </div>,
        document.body
      )}

      {/* 멀티 파일 이동 확인창 */}
      {moveConfirm && createPortal(
        <div onClick={() => setMoveConfirm(null)} style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "start", justifyContent: "center", paddingTop: "120px", background: "rgba(0,0,0,0.35)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "360px", background: "var(--color-bg-elevated)", borderRadius: "12px", border: "1px solid var(--color-border-medium)", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", padding: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-heading)", marginBottom: "8px" }}>파일 이동</div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "20px", lineHeight: 1.6 }}>
              {moveConfirm.paths.length}개 항목을 <strong>{moveConfirm.target.split("\\").pop()}</strong> 폴더로 이동하시겠습니까?
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setMoveConfirm(null)} style={{ padding: "6px 16px", fontSize: "12px", fontWeight: 500, background: "var(--color-bg-hover)", color: "var(--color-text-primary)", border: "none", borderRadius: "6px", cursor: "pointer" }}>취소</button>
              <button onClick={async () => { await doMove(moveConfirm.paths, moveConfirm.target); setMoveConfirm(null); }} style={{ padding: "6px 16px", fontSize: "12px", fontWeight: 600, background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>이동</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
