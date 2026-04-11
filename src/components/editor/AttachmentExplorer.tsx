import { useState, useMemo } from "react";
import { useAppStore, type AttachmentInfo } from "@/stores/appStore";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { Search, Star, ChevronRight } from "lucide-react";
import { getIcon, formatSize, OPENABLE_EXTS } from "./FileAttachment";
import { ContextMenu } from "@/components/ui/ContextMenu";

type GroupBy = "none" | "ext" | "date" | "size";

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "none", label: "전체" },
  { value: "ext", label: "확장자별" },
  { value: "date", label: "편집일별" },
  { value: "size", label: "용량별" },
];

function getExtLabel(ext: string): string {
  const map: Record<string, string> = {
    pdf: "PDF", doc: "Word", docx: "Word", xls: "Excel", xlsx: "Excel", csv: "CSV",
    ppt: "PowerPoint", pptx: "PowerPoint", md: "Markdown", markdown: "Markdown",
    zip: "ZIP", rar: "RAR", "7z": "7Z",
  };
  return map[ext] || ext.toUpperCase() || "기타";
}

function getDateGroup(mtime: number): string {
  const now = Date.now();
  const diff = now - mtime;
  const week = 7 * 24 * 60 * 60 * 1000;
  const month = 30 * 24 * 60 * 60 * 1000;
  const quarter = 90 * 24 * 60 * 60 * 1000;
  if (diff < week) return "최근 1주일";
  if (diff < month) return "최근 1개월";
  if (diff < quarter) return "최근 3개월";
  return "기타";
}

function getSizeGroup(size: number): string {
  if (size >= 100 * 1024 * 1024) return "100MB 이상";
  if (size >= 50 * 1024 * 1024) return "50MB 이상";
  if (size >= 10 * 1024 * 1024) return "10MB 이상";
  if (size >= 1024 * 1024) return "1MB 이상";
  return "1MB 미만";
}

function AttachmentCard({ item, isFav, onToggleFav }: { item: AttachmentInfo; isFav: boolean; onToggleFav: () => void }) {
  const Icon = getIcon(item.filename);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const handleOpen = () => {
    if (OPENABLE_EXTS.has(item.ext)) {
      invoke("open_file", { path: item.absPath });
    } else {
      const folder = item.absPath.substring(0, item.absPath.lastIndexOf("\\"));
      invoke("open_in_explorer", { path: folder });
    }
  };

  const handleOpenDoc = async () => {
    const store = useAppStore.getState();
    const existing = store.tabs.find((t) => t.filePath === item.docPath);
    if (existing) {
      store.setActiveTab(existing.id);
    } else {
      try {
        const content = await readTextFile(item.docPath);
        const name = item.docPath.split("\\").pop() ?? "문서";
        store.openTab(item.docPath, name, content);
      } catch {}
    }
  };

  const favBtnStyle: React.CSSProperties = {
    width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center",
    border: "none", background: "transparent", cursor: "pointer", borderRadius: "4px",
  };

  return (
    <>
    <div
      onClick={(e) => setMenu({ x: e.clientX, y: e.clientY })}
      onDoubleClick={handleOpen}
      title={`${item.filename}\n${formatSize(item.size)} · ${item.docPath.split("\\").pop()}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: "10px",
        padding: "8px 12px",
        borderRadius: "6px", border: "1px solid var(--color-border-medium)",
        background: "var(--color-bg-secondary)", cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Icon size={18} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
            {item.filename}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginTop: "18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", position: "absolute", left: 0, right: 0, top: 0 }}>
            {formatSize(item.size)} · {item.docPath.split("\\").pop()}
          </div>
          <div style={{ height: "18px" }} />
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        title={isFav ? "즐겨찾기 해제" : "즐겨찾기 등록"} style={{ ...favBtnStyle, color: isFav ? "#f5c518" : "var(--color-text-tertiary)", flexShrink: 0 }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-active)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
        <Star size={14} style={isFav ? { fill: "#f5c518" } : {}} />
        </button>
    </div>

    {menu && (
      <ContextMenu
        x={menu.x}
        y={menu.y}
        items={[
          { label: "파일 열기", onClick: handleOpen },
          { label: "파일 위치 열기", onClick: () => { const folder = item.absPath.substring(0, item.absPath.lastIndexOf("\\")); invoke("open_in_explorer", { path: folder }); } },
          { label: "문서 열기", onClick: handleOpenDoc },
        ]}
        onClose={() => setMenu(null)}
      />
    )}
    </>
  );
}

export function AttachmentExplorer() {
  const { allAttachments, favoriteAttachments, addFavoriteAttachment, removeFavoriteAttachment } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [favExpanded, setFavExpanded] = useState(true);

  const filtered = useMemo(() => {
    let items = [...allAttachments];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((a) => a.filename.toLowerCase().includes(q));
    }
    items.sort((a, b) => b.mtime - a.mtime);
    return items;
  }, [allAttachments, searchQuery]);

  const favItems = useMemo(() =>
    filtered.filter((a) => favoriteAttachments.includes(a.absPath)),
    [filtered, favoriteAttachments],
  );

  const grouped = useMemo(() => {
    if (groupBy === "none") return null;
    const groups: Record<string, AttachmentInfo[]> = {};
    for (const item of filtered) {
      let key: string;
      if (groupBy === "ext") key = getExtLabel(item.ext);
      else if (groupBy === "date") key = getDateGroup(item.mtime);
      else key = getSizeGroup(item.size);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [filtered, groupBy]);

  const toggleFav = (path: string) => {
    if (favoriteAttachments.includes(path)) removeFavoriteAttachment(path);
    else addFavoriteAttachment(path);
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "24px 32px" }}>
      <div>

        {/* 검색 (중앙 정렬) */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "8px 16px", borderRadius: "8px",
          border: "1px solid var(--color-border-medium)",
          background: "var(--color-bg-elevated)", width: "600px", maxWidth: "100%",
        }}>
          <Search size={14} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowAll(false); }}
            placeholder="첨부파일 검색..."
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: "13px", color: "var(--color-text-primary)",
            }}
          />
        </div>
        </div>

        {/* 분류 필터 (중앙 정렬) */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap", justifyContent: "center" }}>
          {GROUP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGroupBy(opt.value)}
              style={{
                padding: "4px 12px", fontSize: "11px", fontWeight: groupBy === opt.value ? 600 : 400,
                borderRadius: "12px", cursor: "pointer",
                border: groupBy === opt.value ? "1px solid var(--color-accent)" : "1px solid var(--color-border-light)",
                background: groupBy === opt.value ? "var(--color-accent-subtle)" : "transparent",
                color: groupBy === opt.value ? "var(--color-accent)" : "var(--color-text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 즐겨찾기 섹션 */}
        {favItems.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div
              onClick={() => setFavExpanded(!favExpanded)}
              style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", marginBottom: "8px" }}
            >
              <ChevronRight size={14} style={{
                color: "var(--color-text-tertiary)",
                transform: favExpanded ? "rotate(90deg)" : "none",
                transition: "transform 0.15s",
              }} />
              <Star size={14} style={{ color: "#f5c518", fill: "#f5c518" }} />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                즐겨찾기 ({favItems.length})
              </span>
            </div>
            {favExpanded && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {favItems.map((item) => (
                  <AttachmentCard key={item.absPath} item={item} isFav={true} onToggleFav={() => toggleFav(item.absPath)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 구분선 */}
        {favItems.length > 0 && <div style={{ height: "1px", background: "var(--color-border-light)", margin: "12px 0" }} />}

        {/* 모든 파일 / 그룹별 */}
        {(() => {
          const limit = showAll || searchQuery || groupBy !== "none" ? filtered.length : 30;
          const displayItems = filtered.slice(0, limit);
          return (
            <>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "8px" }}>
                {searchQuery ? `검색 결과 (${filtered.length})` : `모든 파일 (${displayItems.length}${filtered.length > displayItems.length ? ` / ${filtered.length}` : ""})`}
              </div>

              {grouped ? (
                Object.entries(grouped).map(([group, items]) => (
                  <div key={group} style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-tertiary)", marginBottom: "6px", padding: "0 4px" }}>
                      {group} ({items.length})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {items.map((item) => (
                        <AttachmentCard key={item.absPath + item.docPath} item={item} isFav={favoriteAttachments.includes(item.absPath)} onToggleFav={() => toggleFav(item.absPath)} />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {displayItems.map((item) => (
                    <AttachmentCard key={item.absPath + item.docPath} item={item} isFav={favoriteAttachments.includes(item.absPath)} onToggleFav={() => toggleFav(item.absPath)} />
                  ))}
                </div>
              )}
              {displayItems.length < filtered.length && (
                <div style={{ textAlign: "center", marginTop: "12px" }}>
                  <button
                    onClick={() => setShowAll(true)}
                    style={{
                      padding: "6px 20px", fontSize: "12px", fontWeight: 500,
                      border: "1px solid var(--color-border-medium)", borderRadius: "6px",
                      background: "transparent", color: "var(--color-text-secondary)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    더 보기 ({filtered.length - displayItems.length}개)
                  </button>
                </div>
              )}
            </>
          );
        })()}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-tertiary)", fontSize: "13px" }}>
            첨부파일이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
