import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { getTagColor } from "@/utils/frontmatter";
import { readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { parseFrontmatter, updateFrontmatterTags } from "@/utils/frontmatter";
import { shortenPath } from "@/utils/pathUtils";
import { FileText, Search, X, Star, ChevronRight, Clock } from "lucide-react";

export function TagExplorer() {
  const { allTags, openTab, tabs, activeTabId, recentFiles, setRecentFiles, filePreviews, fileContents, favoriteFiles, removeFavoriteFile } = useAppStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    if (activeTab?.type !== "tag-explorer") return;
    async function checkFiles() {
      const valid: string[] = [];
      for (const fp of recentFiles) {
        try { if (await exists(fp)) valid.push(fp); } catch {}
      }
      if (valid.length !== recentFiles.length) setRecentFiles(valid);
    }
    checkFiles();
  }, [activeTab?.id === activeTabId && activeTab?.type]);

  const selectedTags = activeTab?.tagFilters ?? [];
  const [searchQuery, setSearchQuery] = useState("");
  const [favExpanded, setFavExpanded] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);
  const isFavorite = (fp: string) => favoriteFiles.includes(fp);

  const tagNames = Object.keys(allTags).sort();

  const highlightText = (text: string, query: string) => {
    if (!query) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return <>{text.substring(0, idx)}<span style={{ color: "var(--color-accent)", fontWeight: 600 }}>{text.substring(idx, idx + query.length)}</span>{text.substring(idx + query.length)}</>;
  };

  const getContentSnippet = (filePath: string, query: string): string | null => {
    if (!query) return null;
    const body = fileContents[filePath] ?? "";
    const idx = body.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return null;
    const start = Math.max(0, idx - 30);
    const end = Math.min(body.length, idx + query.length + 50);
    let snippet = body.substring(start, end).replace(/\n/g, " ");
    if (start > 0) snippet = "..." + snippet;
    if (end < body.length) snippet = snippet + "...";
    return snippet;
  };

  const toggleTag = (tag: string) => {
    const state = useAppStore.getState();
    const tab = state.tabs.find((t) => t.type === "tag-explorer");
    if (!tab) return;
    const current = tab.tagFilters ?? [];
    const newFilters = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    useAppStore.setState({ tabs: state.tabs.map((t) => t.id === tab.id ? { ...t, tagFilters: newFilters } : t) });
  };

  const allFiles = [...new Set(Object.values(allTags).flat())];
  let matchingFiles: string[];
  if (selectedTags.length > 0) {
    matchingFiles = allFiles.filter((fp) => selectedTags.every((tag) => allTags[tag]?.includes(fp)));
  } else {
    matchingFiles = recentFiles.length > 0 ? recentFiles : allFiles;
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    matchingFiles = (selectedTags.length > 0 ? matchingFiles : allFiles).filter((fp) => {
      const name = (fp.split("\\").pop() ?? "").toLowerCase();
      const body = (fileContents[fp] ?? "").toLowerCase();
      return name.includes(q) || body.includes(q);
    });
  }
  const displayFiles = matchingFiles.slice(0, selectedTags.length > 0 || searchQuery ? 100 : 10);

  const handleOpenFile = async (filePath: string) => {
    try {
      const content = await readTextFile(filePath);
      const name = filePath.split("\\").pop() ?? "문서";
      openTab(filePath, name, content);
    } catch {}
  };

  const renderFileItem = (filePath: string) => {
    const name = filePath.split("\\").pop() ?? "";
    const path = shortenPath(filePath.substring(0, filePath.lastIndexOf("\\")));
    const fileTags = Object.keys(allTags).filter((t) => allTags[t]?.includes(filePath));
    const preview = filePreviews[filePath] ?? "";
    const contentSnippet = searchQuery ? getContentSnippet(filePath, searchQuery) : null;
    const isFav = isFavorite(filePath);

    return (
      <div
        key={filePath}
        onClick={() => handleOpenFile(filePath)}
        title={`${name}\n${path}`}
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "8px 12px", margin: "4px 0",
          borderRadius: "6px", border: "1px solid var(--color-border-medium)",
          background: "var(--color-bg-secondary)", cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
      >
        {isFav
          ? <Star size={16} style={{ color: "#f5c518", fill: "#f5c518", flexShrink: 0 }} />
          : <FileText size={16} style={{ color: "var(--color-text-light)", flexShrink: 0 }} />
        }
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "13px", color: "var(--color-text-primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {searchQuery ? highlightText(name, searchQuery) : name}
            </span>
            {fileTags.length > 0 && (
              <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                {fileTags.slice(0, 3).map((t) => {
                  const c = getTagColor(t);
                  return <span key={t} style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "8px", background: c.bg, color: c.text, fontWeight: 500 }}>{t}</span>;
                })}
              </div>
            )}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {searchQuery && contentSnippet
              ? highlightText(contentSnippet, searchQuery)
              : preview || path
            }
          </div>
        </div>
      </div>
    );
  };

  // 태그 전체 삭제
  const [deleteConfirmTag, setDeleteConfirmTag] = useState<string | null>(null);
  const handleDeleteTag = async (tag: string) => {
    const paths = allTags[tag] ?? [];
    const state = useAppStore.getState();
    for (const path of paths) {
      try {
        const content = await readTextFile(path);
        const fm = parseFrontmatter(content);
        const newTags = fm.tags.filter((t) => t !== tag);
        const newContent = updateFrontmatterTags(content, newTags);
        await writeTextFile(path, newContent);
        const openT = state.tabs.find((t) => t.filePath === path);
        if (openT) state.updateTabContent(openT.id, newContent);
      } catch {}
    }
    const newAllTags = { ...allTags };
    delete newAllTags[tag];
    state.setAllTags(newAllTags);
    const tab = state.tabs.find((t) => t.type === "tag-explorer");
    if (tab) {
      const newFilters = (tab.tagFilters ?? []).filter((t) => t !== tag);
      useAppStore.setState({ tabs: state.tabs.map((t) => t.id === tab.id ? { ...t, tagFilters: newFilters } : t) });
    }
    setDeleteConfirmTag(null);
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "24px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        {/* 검색 */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "8px 16px", borderRadius: "8px",
          border: "1px solid var(--color-border-medium)",
          background: "var(--color-bg-elevated)", marginBottom: "16px",
        }}>
          <Search size={14} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="파일 및 내용 검색..."
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: "13px", color: "var(--color-text-primary)",
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "16px", lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>

        {/* 태그 필터 칩 */}
        {tagNames.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
            {tagNames.map((tag) => {
              const color = getTagColor(tag);
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "4px 12px", borderRadius: "12px", fontSize: "11px", fontWeight: 500,
                    border: isSelected ? `1px solid ${color.text}` : "1px solid var(--color-border-light)",
                    background: isSelected ? color.text : "transparent",
                    color: isSelected ? "#fff" : color.text,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <span onClick={() => toggleTag(tag)}>
                    {tag} ({allTags[tag]?.length ?? 0})
                  </span>
                  <X size={10} onClick={(e) => { e.stopPropagation(); setDeleteConfirmTag(tag); }} style={{ opacity: 0.6, cursor: "pointer" }} />
                </button>
              );
            })}
          </div>
        )}

        {/* 즐겨찾기 섹션 */}
        {!searchQuery && !selectedTags.length && favoriteFiles.length > 0 && (
          <div style={{ marginBottom: "12px" }}>
            <div
              onClick={() => setFavExpanded(!favExpanded)}
              style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", marginBottom: "6px" }}
            >
              <ChevronRight size={14} style={{ color: "var(--color-text-tertiary)", transform: favExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
              <Star size={12} style={{ color: "#f5c518", fill: "#f5c518" }} />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)" }}>즐겨찾기 ({favoriteFiles.length})</span>
            </div>
            {favExpanded && favoriteFiles.map((fp) => renderFileItem(fp))}
          </div>
        )}

        {/* 구분선 */}
        {!searchQuery && !selectedTags.length && favoriteFiles.length > 0 && (
          <div style={{ height: "1px", background: "var(--color-border-light)", margin: "12px 0" }} />
        )}

        {/* 최근 문서 / 검색 결과 */}
        {!selectedTags.length && !searchQuery && (
          <div
            onClick={() => setRecentExpanded(!recentExpanded)}
            style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", marginBottom: "6px" }}
          >
            <ChevronRight size={14} style={{ color: "var(--color-text-tertiary)", transform: recentExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
            <Clock size={12} style={{ color: "var(--color-text-tertiary)" }} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)" }}>최근 문서</span>
          </div>
        )}

        {(selectedTags.length > 0 || searchQuery) && (
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "8px" }}>
            검색 결과 ({displayFiles.length})
          </div>
        )}

        {(!selectedTags.length && !searchQuery ? recentExpanded : true) && (
          displayFiles.length > 0
            ? displayFiles.map((fp) => renderFileItem(fp))
            : <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-tertiary)", fontSize: "13px" }}>
                {searchQuery || selectedTags.length > 0 ? "검색 결과 없음" : "문서 없음"}
              </div>
        )}
      </div>

      {/* 태그 전체 삭제 확인 */}
      {deleteConfirmTag && (
        <div onClick={() => setDeleteConfirmTag(null)} style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "start", justifyContent: "center", paddingTop: "120px", background: "rgba(0,0,0,0.35)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "340px", background: "var(--color-bg-elevated)", borderRadius: "12px", border: "1px solid var(--color-border-medium)", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", padding: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-heading)", marginBottom: "8px" }}>태그 전체 삭제</div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "20px", lineHeight: 1.6 }}>
              <strong>"{deleteConfirmTag}"</strong> 태그가 모든 문서({allTags[deleteConfirmTag]?.length ?? 0}개)에서 삭제됩니다.
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirmTag(null)} style={{ padding: "6px 16px", fontSize: "12px", fontWeight: 500, background: "var(--color-bg-hover)", color: "var(--color-text-primary)", border: "none", borderRadius: "6px", cursor: "pointer" }}>취소</button>
              <button onClick={() => handleDeleteTag(deleteConfirmTag)} style={{ padding: "6px 16px", fontSize: "12px", fontWeight: 600, background: "#e53935", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
