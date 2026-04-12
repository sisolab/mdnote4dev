import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { FileText, Star, Pin, X } from "lucide-react";
import { shortenPath } from "@/utils/pathUtils";

export function TabExplorer() {
  const { tabs, activeTabId, setActiveTab, favoriteFiles } = useAppStore();
  const [search, setSearch] = useState("");

  // 문서 탭만 (특수탭 제외)
  const docTabs = tabs.filter((t) =>
    t.type !== "tag-explorer" && t.type !== "attachment-explorer" && t.type !== "tab-explorer"
  );

  const filtered = search
    ? docTabs.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : docTabs;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 검색 */}
      <div style={{ padding: "16px 16px 8px", maxWidth: "600px", width: "100%", margin: "0 auto" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="열린 탭 검색..."
          style={{
            width: "100%", padding: "8px 12px", fontSize: "13px",
            border: "1px solid var(--color-border-input)", borderRadius: "6px",
            background: "var(--color-bg-primary)", color: "var(--color-text-primary)",
            outline: "none",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border-input)"; }}
        />
      </div>

      {/* 탭 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-tertiary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            열린 문서 ({filtered.length})
          </div>
          {filtered.length === 0 ? (
            <div style={{ fontSize: "13px", color: "var(--color-text-light)", padding: "16px 0" }}>
              {search ? "검색 결과 없음" : "열린 문서가 없습니다"}
            </div>
          ) : (
            filtered.map((tab) => {
              const isActive = tab.id === activeTabId;
              const isFav = tab.filePath ? favoriteFiles.includes(tab.filePath) : false;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    width: "100%", padding: "8px 10px", borderRadius: "6px",
                    border: "none", cursor: "pointer", textAlign: "left",
                    background: isActive ? "var(--color-accent-subtle)" : "transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--color-bg-hover)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <FileText size={14} style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-light)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "13px", fontWeight: isActive ? 600 : 400,
                      color: isActive ? "var(--color-accent)" : "var(--color-text-primary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {tab.title.replace(/\.(md|markdown)$/i, "")}
                      {tab.isDirty && <span style={{ color: "var(--color-accent)", marginLeft: "4px" }}>*</span>}
                      {!tab.filePath && <span style={{ color: "var(--color-text-light)", marginLeft: "4px", fontStyle: "italic" }}>(임시)</span>}
                    </div>
                    {tab.filePath && (
                      <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {shortenPath(tab.filePath)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    {tab.pinned && <Pin size={11} style={{ color: "var(--color-accent)" }} />}
                    {isFav && <Star size={11} style={{ color: "#f5c518", fill: "#f5c518" }} />}
                    {!tab.pinned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if ((tab.isDirty && tab.filePath) || (!tab.filePath && tab.content)) {
                            setActiveTab(tab.id);
                            window.dispatchEvent(new CustomEvent("request-close-tab", { detail: tab.id }));
                          } else {
                            const { closeTab } = useAppStore.getState();
                            closeTab(tab.id);
                          }
                        }}
                        style={{
                          width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center",
                          border: "none", background: "transparent", cursor: "pointer",
                          color: "var(--color-text-muted)", borderRadius: "3px", transition: "all 0.1s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-active)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
