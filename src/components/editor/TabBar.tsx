import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { rename, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "@/stores/appStore";
import { renameDocImages } from "@/utils/imageUtils";
import { Save, FolderOpen, Maximize2, Minimize2, Settings, Search } from "lucide-react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { useSettingsStore } from "@/stores/settingsStore";

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, updateTabTitle, newTab, reorderTabs, toggleSidebar, sidebarCollapsed, sidebarWidth } = useAppStore();
  const { settings } = useSettingsStore();
  const { setShowSettings } = useSettingsStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null);
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
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleHover = useCallback((el: HTMLElement | null) => {
    if (dragIndex !== null) return; // 드래그 중에는 호버 비활성
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

  // 드래그 핸들러
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    setHighlight(null);
    dragNodeRef.current = e.currentTarget as HTMLDivElement;
    e.dataTransfer.effectAllowed = "move";
    // 드래그 이미지를 투명하게 (커스텀 표시용)
    const ghost = document.createElement("div");
    ghost.style.opacity = "0";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      reorderTabs(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ESC로 드래그 취소
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragIndex !== null) {
        setDragIndex(null);
        setDragOverIndex(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dragIndex]);

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => { if (dragIndex === null) setHighlight(null); }}
      onDragEnd={handleDragEnd}
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

      {/* 구분선 */}
      <div style={{ width: "1px", height: "14px", background: "var(--color-border-light)", flexShrink: 0, margin: "0 2px" }} />

      {/* 스크롤 가능한 탭 영역 */}
      <div
        ref={scrollRef}
        className="hide-scrollbar"
        style={{ display: "flex", alignItems: "center", overflowX: "auto", overflowY: "hidden", flex: 1, minWidth: 0, position: "relative" }}
      >

      {tabs.filter((t) => t.type !== "tag-explorer").map((tab, filteredIndex) => {
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
              draggable={editingId !== tab.id}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onMouseEnter={(e) => handleHover(e.currentTarget.querySelector("[data-tab-inner]") as HTMLElement || e.currentTarget)}
              onClick={() => setActiveTab(tab.id)}
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
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startRename(tab.id, tab.title);
                      }}
                      className="truncate"
                      style={{ maxWidth: "120px" }}
                    >
                      {tab.type === "tag-explorer" ? <Search size={13} /> : tab.title.replace(/\.(md|markdown)$/i, "")}
                    </span>
                  )}
                </div>

                {/* 저장 버튼 (임시 문서만, 태그탭 제외) */}
                {!tab.filePath && tab.type !== "tag-explorer" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab(tab.id);
                      window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }));
                    }}
                    title="저장"
                    style={{
                      width: "22px", height: "22px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: "4px", border: "none", background: "transparent",
                      color: "var(--color-accent)", cursor: "pointer", flexShrink: 0,
                      transition: "all 0.1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-active)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <Save size={15} />
                  </button>
                )}

                {/* 닫기 버튼 (태그탭은 닫기 불가) */}
                {tab.type !== "tag-explorer" && <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!tab.filePath && tab.content) {
                      setCloseConfirmId(tab.id);
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
                </button>}
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
        onClick={async () => {
          const wasCollapsed = sidebarCollapsed;
          toggleSidebar();
          if (settings.widthMode === "fixed") {
            const appWindow = getCurrentWindow();
            const factor = await appWindow.scaleFactor();
            const size = await appWindow.innerSize();
            const startWidth = size.width / factor;
            const height = size.height / factor;
            let targetWidth: number;
            if (wasCollapsed) {
              targetWidth = startWidth + sidebarWidth;
            } else {
              targetWidth = settings.editorMaxWidth + 96 + 40;
            }
            // 부드러운 리사이즈 애니메이션 (사이드바 전환과 동기화)
            const duration = 350;
            const startTime = performance.now();
            const animate = async (now: number) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const ease = 1 - Math.pow(1 - progress, 4); // ease-out quartic
              const w = startWidth + (targetWidth - startWidth) * ease;
              await appWindow.setSize(new LogicalSize(Math.round(w), height));
              if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
          }
        }}
        onMouseEnter={(e) => handleHover(e.currentTarget)}
        title={sidebarCollapsed ? "사이드바 펼치기" : "사이드바 좁히기"}
        style={{
          width: "34px", height: "40px",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent", cursor: "pointer",
          color: "var(--color-text-secondary)", transition: "color 0.1s",
          position: "relative", zIndex: 1, flexShrink: 0,
        }}
      >
        {sidebarCollapsed ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>

      {/* 임시 문서 닫기 확인 */}
      {closeConfirmId && (
        <div
          onClick={() => setCloseConfirmId(null)}
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
              임시 문서 닫기
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "20px", lineHeight: 1.6 }}>
              이 문서는 아직 파일로 저장되지 않았습니다.<br />
              닫으면 내용이 삭제됩니다. 파일로 먼저 저장하세요.
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
                onClick={() => {
                  setActiveTab(closeConfirmId);
                  window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }));
                  setCloseConfirmId(null);
                }}
                style={{
                  padding: "6px 16px", fontSize: "12px", fontWeight: 600,
                  background: "var(--color-accent)", color: "#fff",
                  border: "none", borderRadius: "6px", cursor: "pointer",
                }}
              >
                저장
              </button>
              <button
                onClick={() => { closeTab(closeConfirmId); setCloseConfirmId(null); }}
                style={{
                  padding: "6px 16px", fontSize: "12px", fontWeight: 600,
                  background: "#e53935", color: "#fff",
                  border: "none", borderRadius: "6px", cursor: "pointer",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
