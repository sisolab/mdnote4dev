import { useState, useRef, useCallback, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, updateTabTitle, newTab, reorderTabs } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const finishRename = (id: string) => {
    if (editValue.trim()) {
      const newTitle = editValue.trim().endsWith(".md") ? editValue.trim() : editValue.trim() + ".md";
      updateTabTitle(id, newTitle);
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

  if (tabs.length === 0) return null;

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => { if (dragIndex === null) setHighlight(null); }}
      onDragEnd={handleDragEnd}
      style={{ position: "relative", padding: "0 8px" }}
      className="flex items-center border-b border-border-light bg-bg-primary shrink-0 overflow-x-auto"
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

      {tabs.map((tab, index) => {
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
          <div key={tab.id} style={{ display: "flex", alignItems: "center" }}>
            {index > 0 && (
              <div style={{
                width: "1px", height: "14px", background: "var(--color-border-light)", flexShrink: 0, margin: "0 2px",
                opacity: (isDragging || (index > 0 && dragIndex === index - 1)) ? 0 : 1,
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
                  padding: "0 14px 0 24px",
                  minWidth: "120px",
                  cursor: isDragging ? "grabbing" : "pointer",
                  position: "relative",
                  zIndex: 1,
                  color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                  fontWeight: 600,
                  fontSize: "12px",
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
                  {tab.isDirty && (
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
                      {tab.title.replace(/\.(md|markdown)$/i, "")}
                    </span>
                  )}
                </div>

                {/* 닫기 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  style={{
                    width: "16px", height: "16px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: "3px", border: "none", background: "transparent",
                    color: "var(--color-text-muted)", cursor: "pointer", flexShrink: 0,
                    fontSize: "14px", lineHeight: 1, transition: "all 0.1s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-active)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                >
                  ×
                </button>
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

      {/* 새 탭 버튼 */}
      <button
        onClick={() => newTab()}
        onMouseEnter={(e) => handleHover(e.currentTarget)}
        style={{
          width: "30px", height: "40px",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent",
          color: "var(--color-text-muted)", cursor: "pointer", fontSize: "16px",
          position: "relative", zIndex: 1, transition: "color 0.1s",
        }}
        title="새 탭"
      >
        +
      </button>
    </div>
  );
}
