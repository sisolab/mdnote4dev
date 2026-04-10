import { useState, useRef, useCallback } from "react";
import { useAppStore } from "@/stores/appStore";

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, updateTabTitle, newTab } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleHover = useCallback((el: HTMLElement | null) => {
    if (!el || !containerRef.current) {
      setHighlight(null);
      return;
    }
    const cr = containerRef.current.getBoundingClientRect();
    const br = el.getBoundingClientRect();
    setHighlight({ left: br.left - cr.left, top: br.top - cr.top, width: br.width, height: br.height });
  }, []);

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setEditValue(title.replace(/\.md$/, ""));
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const finishRename = (id: string) => {
    if (editValue.trim()) {
      const newTitle = editValue.trim().endsWith(".md") ? editValue.trim() : editValue.trim() + ".md";
      updateTabTitle(id, newTitle);
    }
    setEditingId(null);
  };

  if (tabs.length === 0) return null;

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => setHighlight(null)}
      style={{ position: "relative", padding: "0 8px" }}
      className="flex items-center border-b border-border-light bg-bg-primary shrink-0 overflow-x-auto"
    >
      {/* 슬라이딩 호버 하이라이트 — 직사각형 */}
      <div style={{
        position: "absolute",
        left: highlight ? `${highlight.left}px` : 0,
        top: highlight ? `${highlight.top}px` : 0,
        width: highlight ? `${highlight.width}px` : 0,
        height: highlight ? `${highlight.height}px` : 0,
        background: "#f0f1f3",
        borderRadius: "3px",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: highlight ? 1 : 0,
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        const prevIsActive = index > 0 && tabs[index - 1].id === activeTabId;

        return (
          <div key={tab.id} style={{ display: "flex", alignItems: "center" }}>
            {/* 구분선 */}
            {index > 0 && !isActive && !prevIsActive && (
              <div style={{ width: "1px", height: "14px", background: "#ddd", flexShrink: 0 }} />
            )}

            <div
              onMouseEnter={(e) => handleHover(e.currentTarget)}
              onClick={() => setActiveTab(tab.id)}
              style={{
                height: "34px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                padding: "0 14px 0 24px",
                minWidth: "120px",
                cursor: "pointer",
                position: "relative",
                zIndex: 1,
                color: isActive ? "#1a73e8" : "#555",
                fontWeight: isActive ? 600 : 400,
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
                width: isActive ? "14px" : "0px",
                height: "2px",
                borderRadius: "1px",
                background: "#1a73e8",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }} />

              {/* 더티 인디케이터 */}
              {tab.isDirty && (
                <div style={{
                  width: "5px", height: "5px", borderRadius: "50%",
                  background: isActive ? "#1a73e8" : "#aaa",
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
                    fontSize: "12px", fontWeight: 600, color: "#333",
                    background: "#fff", border: "1px solid #1a73e8",
                    borderRadius: "3px", padding: "1px 4px", outline: "none", width: "100px",
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
                  {tab.title}
                </span>
              )}

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
                  color: "#aaa", cursor: "pointer", flexShrink: 0,
                  fontSize: "14px", lineHeight: 1, transition: "all 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#e0e0e0"; e.currentTarget.style.color = "#555"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#aaa"; }}
              >
                ×
              </button>
            </div>
          </div>
        );
      })}

      {/* 새 탭 버튼 */}
      <button
        onClick={() => newTab()}
        onMouseEnter={(e) => handleHover(e.currentTarget)}
        style={{
          width: "30px", height: "34px",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent",
          color: "#aaa", cursor: "pointer", fontSize: "16px",
          position: "relative", zIndex: 1, transition: "color 0.1s",
        }}
        title="새 탭"
      >
        +
      </button>
    </div>
  );
}
