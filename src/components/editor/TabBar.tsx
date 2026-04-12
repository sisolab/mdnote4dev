import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { rename, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "@/stores/appStore";
import { renameDocImages } from "@/utils/imageUtils";
import { FolderOpen, Maximize2, Minimize2, Settings, Search, Paperclip, Pin, LayoutList } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, updateTabTitle, newTab, reorderTabs, toggleSidebar, sidebarCollapsed, pinTab, unpinTab } = useAppStore();
  const { setShowSettings } = useSettingsStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null);
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", updateScrollButtons);
    return () => { if (el) el.removeEventListener("scroll", updateScrollButtons); };
  }, [updateScrollButtons, tabs.length]);

  useEffect(() => {
    const observer = new ResizeObserver(updateScrollButtons);
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [updateScrollButtons]);

  // 활성 탭이 바뀌면 해당 탭으로 스크롤
  useEffect(() => {
    if (!activeTabId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [activeTabId]);

  // Ctrl+W 등 외부에서 닫기 요청 시 확인 다이얼로그
  useEffect(() => {
    const handler = (e: Event) => {
      const tabId = (e as CustomEvent).detail as string;
      setCloseConfirmId(tabId);
    };
    window.addEventListener("request-close-tab", handler);
    return () => window.removeEventListener("request-close-tab", handler);
  }, []);

  // 닫기 확인 다이얼로그 ESC 닫기
  useEffect(() => {
    if (!closeConfirmId) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setCloseConfirmId(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeConfirmId]);

  const scrollTabs = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 360; // ~3 tabs
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 드래그 상태
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragState = useRef<{ startX: number; active: boolean; index: number }>({ startX: 0, active: false, index: -1 });
  const dragOverRef = useRef<number | null>(null);
  const wasDragging = useRef(false);

  const handleHover = useCallback((el: HTMLElement | null) => {
    if (dragIndex !== null) return;
    if (!el || !containerRef.current) {
      setHighlight(null);
      return;
    }
    const cr = containerRef.current.getBoundingClientRect();
    const br = el.getBoundingClientRect();
    setHighlight({ left: br.left - cr.left, top: br.top - cr.top, width: br.width, height: br.height });
  }, [dragIndex]);

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setEditValue(title.replace(/\.(md|markdown)$/i, ""));
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const finishRename = async (id: string) => {
    if (editValue.trim()) {
      const newTitle = editValue.trim().endsWith(".md") ? editValue.trim() : editValue.trim() + ".md";
      const tab = tabs.find((t) => t.id === id);
      if (tab?.filePath) {
        const parentPath = tab.filePath.substring(0, tab.filePath.lastIndexOf("\\"));
        const newPath = `${parentPath}\\${newTitle}`;
        if (newPath !== tab.filePath) {
          try {
            // 이미지 파일명 변경
            const oldDoc = tab.title.replace(/\.(md|markdown)$/i, "");
            const newDoc = newTitle.replace(/\.(md|markdown)$/i, "");
            if (oldDoc !== newDoc) {
              const content = tab.content ?? await readTextFile(tab.filePath);
              if (content) {
                const updated = await renameDocImages(parentPath, oldDoc, newDoc, content);
                if (updated !== content) {
                  useAppStore.getState().updateTabContent(id, updated);
                  await writeTextFile(tab.filePath, updated);
                }
              }
            }
            await rename(tab.filePath, newPath);
            const state = useAppStore.getState();
            state.updateTabFilePath(id, newPath, newTitle);
            if (state.favoriteFiles.includes(tab.filePath)) {
              state.removeFavoriteFile(tab.filePath);
              state.addFavoriteFile(newPath);
            }
            state.refreshFileTree();
          } catch (err) {
            console.error("파일 이름 변경 실패:", err);
          }
        }
      } else {
        updateTabTitle(id, newTitle);
      }
    }
    setEditingId(null);
  };

  // 탭 드래그 (mouse event 기반 — HTML5 Drag API는 Tauri WebView에서 안 됨)
  const startTabDrag = (e: React.MouseEvent, index: number) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, input")) return;
    dragState.current = { startX: e.clientX, active: false, index };
    wasDragging.current = false;

    const onMove = (me: MouseEvent) => {
      if (!dragState.current.active) {
        if (Math.abs(me.clientX - dragState.current.startX) < 5) return;
        dragState.current.active = true;
        wasDragging.current = true;
        setDragIndex(dragState.current.index);
        setHighlight(null);
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }

      // 마우스 아래 탭 찾기
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;
      const tabEls = scrollEl.querySelectorAll("[data-tab-id]");
      for (let i = 0; i < tabEls.length; i++) {
        const rect = tabEls[i].getBoundingClientRect();
        if (me.clientX >= rect.left && me.clientX <= rect.right) {
          // filtered 탭 목록에서의 인덱스를 원래 tabs 배열 인덱스로 변환
          const tabId = tabEls[i].getAttribute("data-tab-id");
          const originalIndex = tabs.findIndex((t) => t.id === tabId);
          if (originalIndex >= 0) {
            setDragOverIndex(originalIndex);
            dragOverRef.current = originalIndex;
          }
          break;
        }
      }
    };

    const cleanupAll = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("keydown", handleEsc);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setDragIndex(null);
      setDragOverIndex(null);
      dragOverRef.current = null;
      dragState.current.active = false;
    };

    function handleUp() {
      if (dragState.current.active) {
        const from = dragState.current.index;
        const to = dragOverRef.current;
        if (to !== null && from !== to) {
          reorderTabs(from, to);
        }
      }
      cleanupAll();
    }

    function handleEsc(ke: KeyboardEvent) {
      if (ke.key === "Escape") cleanupAll();
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("keydown", handleEsc);
  };

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => { if (dragIndex === null) setHighlight(null); }}
      style={{ position: "relative", padding: "0 8px" }}
      className="flex items-center border-b border-border-light bg-bg-primary shrink-0 overflow-hidden"
    >
      {/* 슬라이딩 호버 하이라이트 */}
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

      {/* 고정 검색탭 */}
      {tabs.filter((t) => t.type === "tag-explorer").map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            data-tab-id={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onMouseEnter={(e) => handleHover(e.currentTarget)}
            style={{
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 14px",
              cursor: "pointer",
              position: "relative",
              zIndex: 1,
              color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
              transition: "color 0.1s",
              flexShrink: 0,
            }}
          >
            <Search size={13} />
            <div style={{
              position: "absolute",
              bottom: "0",
              left: "50%",
              transform: "translateX(-50%)",
              width: isActive ? "80%" : "0%",
              height: "2px",
              borderRadius: "1px",
              background: "var(--color-accent)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }} />
          </div>
        );
      })}

      <div style={{ width: "1px", height: "14px", background: "var(--color-border-light)", flexShrink: 0, margin: "0 2px" }} />

      {/* 고정 첨부파일탭 */}
      {tabs.filter((t) => t.type === "attachment-explorer").map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            data-tab-id={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onMouseEnter={(e) => handleHover(e.currentTarget)}
            style={{
              height: "40px",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 14px", cursor: "pointer",
              position: "relative", zIndex: 1,
              color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
              transition: "color 0.1s", flexShrink: 0,
            }}
          >
            <Paperclip size={13} />
            <div style={{
              position: "absolute", bottom: "0", left: "50%", transform: "translateX(-50%)",
              width: isActive ? "80%" : "0%", height: "2px",
              borderRadius: "1px", background: "var(--color-accent)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }} />
          </div>
        );
      })}

      <div style={{ width: "1px", height: "14px", background: "var(--color-border-light)", flexShrink: 0, margin: "0 2px" }} />

      {/* 고정 탭 탐색기 */}
      {tabs.filter((t) => t.type === "tab-explorer").map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div key={tab.id} data-tab-id={tab.id} onClick={() => setActiveTab(tab.id)}
            onMouseEnter={(e) => handleHover(e.currentTarget)}
            style={{ height: "40px", display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 14px", cursor: "pointer", position: "relative", zIndex: 1,
              color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
              transition: "color 0.1s", flexShrink: 0 }}>
            <LayoutList size={13} />
            <div style={{ position: "absolute", bottom: "0", left: "50%", transform: "translateX(-50%)",
              width: isActive ? "80%" : "0%", height: "2px", borderRadius: "1px",
              background: "var(--color-accent)", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)" }} />
          </div>
        );
      })}

      {/* 구분선 */}
      <div style={{ width: "1px", height: "14px", background: "var(--color-border-light)", flexShrink: 0, margin: "0 2px" }} />

      {/* 스크롤 가능한 탭 영역 */}
      <div
        ref={scrollRef}
        className="hide-scrollbar"
        style={{ display: "flex", alignItems: "center", overflowX: "auto", overflowY: "hidden", flex: 1, minWidth: 0, position: "relative" }}
      >

      {tabs.filter((t) => t.type !== "tag-explorer" && t.type !== "attachment-explorer" && t.type !== "tab-explorer").map((tab, filteredIndex) => {
        const index = tabs.indexOf(tab);
        const isActive = tab.id === activeTabId;
        const isDragging = dragIndex === index;
        const isDragOver = dragOverIndex === index && dragIndex !== null && dragIndex !== index;

        // 밀려나는 방향 계산
        let translateX = 0;
        if (dragIndex !== null && dragOverIndex !== null && !isDragging) {
          if (dragIndex < dragOverIndex) {
            // 오른쪽으로 드래그: dragIndex+1 ~ dragOverIndex 사이 탭들이 왼쪽으로
            if (index > dragIndex && index <= dragOverIndex) translateX = -1;
          } else if (dragIndex > dragOverIndex) {
            // 왼쪽으로 드래그: dragOverIndex ~ dragIndex-1 사이 탭들이 오른쪽으로
            if (index >= dragOverIndex && index < dragIndex) translateX = 1;
          }
        }

        return (
          <div key={tab.id} data-tab-id={tab.id} style={{ display: "flex", alignItems: "center" }}>
            {filteredIndex > 0 && (
              <div style={{
                width: "1px", height: "14px", background: "var(--color-border-light)", flexShrink: 0, margin: "0 2px",
                opacity: (isDragging || (filteredIndex > 0 && dragIndex === index - 1)) ? 0 : 1,
                transition: "opacity 0.15s",
              }} />
            )}

            <div
              onMouseDown={(e) => { if (editingId !== tab.id) startTabDrag(e, index); }}
              onMouseEnter={(e) => handleHover(e.currentTarget.querySelector("[data-tab-inner]") as HTMLElement || e.currentTarget)}
              onClick={() => { if (!wasDragging.current) setActiveTab(tab.id); }}
              onDoubleClick={(e) => e.preventDefault()}
              onContextMenu={(e) => {
                e.preventDefault();
                setTabContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
              }}
              style={{
                transform: isDragging
                  ? "scale(1.03)"
                  : translateX !== 0
                    ? `translateX(${translateX * 8}px)`
                    : "none",
                opacity: isDragging ? 0.5 : 1,
                transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s",
                zIndex: isDragging ? 10 : 1,
                position: "relative",
                userSelect: "none",
              }}
            >
              <div
                data-tab-inner
                onMouseEnter={(e) => handleHover(e.currentTarget)}
                style={{
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  padding: tab.type === "tag-explorer" ? "0 16px" : tab.filePath ? "0 14px 0 24px" : "0 10px 0 24px",
                  minWidth: tab.type === "tag-explorer" ? "50px" : tab.filePath ? "120px" : "140px",
                  cursor: isDragging ? "grabbing" : "pointer",
                  position: "relative",
                  zIndex: 1,
                  color: !tab.filePath ? "var(--color-text-light)" : isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                  fontWeight: tab.filePath ? 600 : 400,
                  fontStyle: tab.filePath ? "normal" : "italic",
                  fontSize: "13px",
                  transition: "color 0.1s",
                }}
              >
                {/* 활성 언더라인 */}
                <div style={{
                  position: "absolute",
                  bottom: "0",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: isActive ? "80%" : "0%",
                  height: "2px",
                  borderRadius: "1px",
                  background: "var(--color-accent)",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }} />

                {/* 더티 인디케이터 */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {tab.isDirty && tab.filePath && (
                    <div style={{
                      width: "5px", height: "5px", borderRadius: "50%",
                      background: isActive ? "var(--color-accent)" : "#aaa",
                      flexShrink: 0,
                    }} />
                  )}

                  {/* 탭 이름 */}
                  {editingId === tab.id ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => finishRename(tab.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") finishRename(tab.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: "12px", fontWeight: 600, color: "var(--color-accent)",
                        background: "transparent", border: "none",
                        borderRadius: "0", padding: "0", outline: "none", width: "100px",
                      }}
                    />
                  ) : (
                    <span
                      className="truncate"
                      style={{ maxWidth: "120px" }}
                    >
                      {tab.type === "tag-explorer" ? <Search size={13} /> : tab.title.replace(/\.(md|markdown)$/i, "")}
                    </span>
                  )}
                </div>

                {/* 고정 핀 또는 닫기 버튼 */}
                {tab.type !== "tag-explorer" && tab.type !== "attachment-explorer" && tab.type !== "tab-explorer" && (
                  tab.pinned ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); unpinTab(tab.id); }}
                      title="고정 해제"
                      style={{
                        width: "16px", height: "16px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: "3px", border: "none", background: "transparent",
                        color: "var(--color-accent)", cursor: "pointer", flexShrink: 0,
                        transition: "all 0.1s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-active)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <Pin size={11} />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const saveMode = useSettingsStore.getState().saveMode;
                        if (!tab.filePath && tab.content) {
                          setCloseConfirmId(tab.id);
                        } else if (tab.isDirty && tab.filePath) {
                          if (saveMode === "on-tab-close" || saveMode === "realtime") {
                            setActiveTab(tab.id);
                            window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }));
                            const onSaved = () => { closeTab(tab.id); window.removeEventListener("manual-save", onSaved); };
                            window.addEventListener("manual-save", onSaved);
                          } else {
                            setCloseConfirmId(tab.id);
                          }
                        } else {
                          closeTab(tab.id);
                        }
                      }}
                      style={{
                        width: "16px", height: "16px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: "3px", border: "none", background: "transparent",
                        color: "var(--color-text-tertiary)", cursor: "pointer", flexShrink: 0,
                        fontSize: "14px", lineHeight: 1, transition: "all 0.1s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-active)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                    >
                      ×
                    </button>
                  )
                )}
              </div>

              {/* 드롭 인디케이터 */}
              {isDragOver && (
                <div style={{
                  position: "absolute",
                  left: dragIndex !== null && dragIndex > index ? "0" : "auto",
                  right: dragIndex !== null && dragIndex < index ? "0" : "auto",
                  top: "4px",
                  bottom: "4px",
                  width: "2px",
                  borderRadius: "1px",
                  background: "var(--color-accent)",
                  zIndex: 20,
                }} />
              )}
            </div>
          </div>
        );
      })}

      </div>

      {/* 스크롤 버튼 */}
      {(canScrollLeft || canScrollRight) && (
        <>
          <button
            onClick={() => scrollTabs("left")}
            disabled={!canScrollLeft}
            style={{
              width: "24px", height: "40px",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", background: "transparent", cursor: canScrollLeft ? "pointer" : "default",
              color: canScrollLeft ? "var(--color-text-tertiary)" : "var(--color-text-muted)",
              flexShrink: 0, transition: "color 0.1s",
            }}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => scrollTabs("right")}
            disabled={!canScrollRight}
            style={{
              width: "24px", height: "40px",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", background: "transparent", cursor: canScrollRight ? "pointer" : "default",
              color: canScrollRight ? "var(--color-text-tertiary)" : "var(--color-text-muted)",
              flexShrink: 0, transition: "color 0.1s",
            }}
          >
            <ChevronRight size={15} />
          </button>
        </>
      )}

      {/* 새 탭 버튼 */}
      <button
        onClick={() => newTab()}
        onMouseEnter={(e) => handleHover(e.currentTarget)}
        style={{
          width: "34px", height: "40px",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent",
          color: "var(--color-text-secondary)", cursor: "pointer", fontSize: "15px",
          position: "relative", zIndex: 1, transition: "color 0.1s",
        }}
        title="새 탭"
      >
        +
      </button>

      {/* 문서 열기 버튼 */}
      <button
        onClick={async () => {
          const path = await open({ filters: [{ name: "Markdown", extensions: ["md"] }], multiple: false });
          if (path && typeof path === "string") {
            const content = await readTextFile(path);
            const name = path.split("\\").pop() ?? "문서";
            useAppStore.getState().openTab(path, name, content);
          }
        }}
        onMouseEnter={(e) => handleHover(e.currentTarget)}
        style={{
          width: "34px", height: "40px",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent",
          color: "var(--color-text-secondary)", cursor: "pointer",
          position: "relative", zIndex: 1, transition: "color 0.1s",
        }}
        title="문서 열기"
      >
        <FolderOpen size={15} />
      </button>

      {/* 오른쪽: 설정 + 사이드바 토글 */}
      <button
        onClick={() => setShowSettings(true)}
        onMouseEnter={(e) => handleHover(e.currentTarget)}
        title="설정"
        style={{
          width: "34px", height: "40px",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent", cursor: "pointer",
          color: "var(--color-text-secondary)", transition: "color 0.1s",
          position: "relative", zIndex: 1, flexShrink: 0,
        }}
      >
        <Settings size={15} />
      </button>
      <button
        onClick={() => toggleSidebar()}
        onMouseEnter={(e) => handleHover(e.currentTarget)}
        style={{
          width: "34px", height: "40px",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent", cursor: "pointer",
          color: "var(--color-text-secondary)", transition: "color 0.1s",
          position: "relative", zIndex: 1, flexShrink: 0,
        }}
      >
        {sidebarCollapsed ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
      </button>

      {/* 임시 문서 닫기 확인 */}
      {/* 탭 컨텍스트 메뉴 */}
      {tabContextMenu && (() => {
        const tab = tabs.find((t) => t.id === tabContextMenu.tabId);
        if (!tab) return null;
        const isSpecial = tab.type === "tag-explorer" || tab.type === "attachment-explorer" || tab.type === "tab-explorer";
        const menuItems: ContextMenuItem[] = [];
        if (!isSpecial) {
          menuItems.push({
            label: tab.pinned ? "고정 해제" : "탭 고정",
            onClick: () => tab.pinned ? unpinTab(tab.id) : pinTab(tab.id),
          });
        }
        if (!isSpecial && tab.filePath) {
          menuItems.push({ label: "이름 바꾸기", onClick: () => startRename(tab.id, tab.title) });
        }
        if (!isSpecial && !tab.pinned) {
          menuItems.push({ label: "닫기", onClick: () => {
            if ((tab.isDirty && tab.filePath) || (!tab.filePath && tab.content)) {
              setCloseConfirmId(tab.id);
            } else {
              closeTab(tab.id);
            }
          } });
        }
        menuItems.push({
          label: "이 탭 외에 모두 닫기",
          onClick: () => {
            const toClose = tabs.filter((t) =>
              t.id !== tab.id &&
              t.type !== "tag-explorer" &&
              t.type !== "attachment-explorer" &&
              !t.pinned &&
              t.filePath
            );
            toClose.forEach((t) => closeTab(t.id));
          },
        });
        return (
          <ContextMenu
            x={tabContextMenu.x}
            y={tabContextMenu.y}
            items={menuItems}
            onClose={() => setTabContextMenu(null)}
          />
        );
      })()}

      {closeConfirmId && (() => {
        const confirmTab = tabs.find((t) => t.id === closeConfirmId);
        const isTemp = confirmTab && !confirmTab.filePath;
        return (
        <div
          onClick={() => setCloseConfirmId(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
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
              {isTemp ? "임시 문서 닫기" : "변경 사항 저장"}
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "20px", lineHeight: 1.6 }}>
              {isTemp
                ? <>이 문서는 아직 파일로 저장되지 않았습니다.<br />닫으면 내용이 삭제됩니다. 파일로 먼저 저장하세요.</>
                : <>변경 사항이 저장되지 않았습니다.<br />저장하지 않고 닫으면 변경 내용이 사라집니다.</>
              }
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setCloseConfirmId(null)}
                style={{
                  padding: "6px 16px", fontSize: "12px", fontWeight: 500,
                  background: "var(--color-bg-hover)", color: "var(--color-text-primary)",
                  border: "none", borderRadius: "6px", cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={() => { const id = closeConfirmId; setCloseConfirmId(null); requestAnimationFrame(() => closeTab(id)); }}
                style={{
                  padding: "6px 16px", fontSize: "12px", fontWeight: 600,
                  background: "var(--color-bg-hover)", color: "var(--color-text-primary)",
                  border: "none", borderRadius: "6px", cursor: "pointer",
                }}
              >
                {isTemp ? "닫기" : "저장 안 함"}
              </button>
              <button
                onClick={() => {
                  const tabId = closeConfirmId;
                  setActiveTab(tabId);
                  setCloseConfirmId(null);
                  requestAnimationFrame(() => {
                    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "s", bubbles: true }));
                    if (!isTemp) {
                      const onSaved = () => { requestAnimationFrame(() => closeTab(tabId)); window.removeEventListener("manual-save", onSaved); };
                      window.addEventListener("manual-save", onSaved);
                    }
                  });
                }}
                style={{
                  padding: "6px 16px", fontSize: "12px", fontWeight: 600,
                  background: "var(--color-accent)", color: "#fff",
                  border: "none", borderRadius: "6px", cursor: "pointer",
                }}
              >
                {isTemp ? "저장" : "저장 후 닫기"}
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
