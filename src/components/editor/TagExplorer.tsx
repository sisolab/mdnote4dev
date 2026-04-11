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

  // 검색 탭 활성화 시 최근 문서 존재 여부 체크
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

  // 검색어 하이라이트 헬퍼
  const highlightText = (text: string, query: string) => {
    if (!query) return <>{text}</>;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const idx = lowerText.indexOf(lowerQuery);
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.substring(0, idx)}
        <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>{text.substring(idx, idx + query.length)}</span>
        {text.substring(idx + query.length)}
      </>
    );
  };

  // 내용 검색 스니펫 생성
  const getContentSnippet = (filePath: string, query: string): string | null => {
    if (!query) return null;
    const body = fileContents[filePath] ?? "";
    const lowerBody = body.toLowerCase();
    const idx = lowerBody.indexOf(query.toLowerCase());
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
    const newFilters = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    useAppStore.setState({
      tabs: state.tabs.map((t) => t.id === tab.id ? { ...t, tagFilters: newFilters } : t),
    });
  };

  // 전체 파일 수집 (즐겨찾기 폴더 기반 + allTags에 있는 모든 파일)
  const allFiles = [...new Set(Object.values(allTags).flat())];

  // 필터링: 태그 AND 검색어
  let matchingFiles: string[];
  if (selectedTags.length > 0) {
    matchingFiles = allFiles.filter((fp) =>
      selectedTags.every((tag) => allTags[tag]?.includes(fp))
    );
  } else if (searchQuery) {
    // 검색 시 전체 파일 대상
    matchingFiles = recentFiles.length > 0 ? recentFiles : allFiles;
  } else {
    matchingFiles = recentFiles.length > 0 ? recentFiles : allFiles;
  }

  // 검색어 필터 (제목 + 내용)
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    matchingFiles = matchingFiles.filter((fp) => {
      const name = (fp.split("\\").pop() ?? "").toLowerCase();
      const body = (fileContents[fp] ?? "").toLowerCase();
      return name.includes(q) || body.includes(q);
    });
  }

  // 최대 표시 제한
  const displayFiles = matchingFiles.slice(0, selectedTags.length > 0 || searchQuery ? 100 : 10);

  const handleOpenFile = async (filePath: string) => {
    try {
      const content = await readTextFile(filePath);
      const name = filePath.split("\\").pop() ?? "문서";
      openTab(filePath, name, content);
    } catch {}
  };

  // 공통 파일 항목 렌더링
  const renderFileItem = (filePath: string) => {
    const name = filePath.split("\\").pop() ?? "";
    const path = shortenPath(filePath.substring(0, filePath.lastIndexOf("\\")));
    const fileTags = Object.keys(allTags).filter((t) => allTags[t]?.includes(filePath));
    const preview = filePreviews[filePath] ?? "";
    const contentSnippet = searchQuery ? getContentSnippet(filePath, searchQuery) : null;
    return (
      <button
        key={filePath}
        onClick={() => handleOpenFile(filePath)}
        style={{
          display: "flex", alignItems: "flex-start", gap: "10px", width: "100%",
          padding: "8px 16px", border: "none", background: "transparent",
          cursor: "pointer", textAlign: "left", transition: "background 0.1s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        {isFavorite(filePath)
          ? <Star size={14} style={{ color: "#f5c518", fill: "#f5c518", flexShrink: 0, marginTop: "2px" }} />
          : <FileText size={14} style={{ color: "var(--color-text-light)", flexShrink: 0, marginTop: "2px" }} />
        }
        <div style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "13px", color: "var(--color-text-primary)", fontWeight: 500, flexShrink: 0, whiteSpace: "nowrap" }}>{searchQuery ? highlightText(name, searchQuery) : name}</span>
            <span className="truncate" style={{ fontSize: "10px", color: "var(--color-text-light)", flexShrink: 1, minWidth: 0 }}>{path}</span>
            {fileTags.length > 0 && (
              <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                {fileTags.map((t) => {
                  const c = getTagColor(t);
                  return <span key={t} style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "3px", background: c.bg, color: c.text, fontWeight: 500 }}>{t}</span>;
                })}
              </div>
            )}
          </div>
          {searchQuery && contentSnippet ? (
            <div className="truncate" style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "3px" }}>{highlightText(contentSnippet, searchQuery)}</div>
          ) : !searchQuery && preview ? (
            <div className="truncate" style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "3px" }}>{preview}</div>
          ) : null}
        </div>
      </button>
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
    // 선택된 태그에서도 제거
    const tab = state.tabs.find((t) => t.type === "tag-explorer");
    if (tab) {
      const newFilters = (tab.tagFilters ?? []).filter((t) => t !== tag);
      useAppStore.setState({
        tabs: state.tabs.map((t) => t.id === tab.id ? { ...t, tagFilters: newFilters } : t),
      });
    }
    setDeleteConfirmTag(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 검색창 + 태그 영역 */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: "12px",
        padding: "32px 16px 16px",
        borderBottom: "1px solid var(--color-border-light)",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          width: "400px", maxWidth: "100%", padding: "8px 12px",
          border: "1px solid var(--color-border-medium)",
          borderRadius: "6px", background: "var(--color-bg-secondary)",
        }}>
          <Search size={14} style={{ color: "var(--color-text-light)", flexShrink: 0 }} strokeWidth={2.5} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="파일 및 내용 검색"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "14px", lineHeight: 1 }}
            >
              ×
            </button>
          )}
        </div>

        {/* 태그 버튼들 */}
        {tagNames.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center",
          justifyContent: "center",
        }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-tertiary)", marginRight: "2px" }}>Tags:</span>
        {tagNames.map((tag) => {
          const color = getTagColor(tag);
          const isSelected = selectedTags.includes(tag);
          return (
            <span
              key={tag}
              style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                padding: "4px 10px", borderRadius: "4px", fontSize: "13px", fontWeight: 500,
                background: isSelected ? color.text : color.bg,
                color: isSelected ? "#fff" : color.text,
                cursor: "pointer", transition: "all 0.1s",
              }}
            >
              <span onClick={() => toggleTag(tag)}>
                {tag} <span style={{ opacity: 0.7, fontSize: "11px" }}>({allTags[tag]?.length ?? 0})</span>
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConfirmTag(tag); }}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: isSelected ? "#fff" : color.text, padding: 0, display: "flex", opacity: 0.5 }}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
      </div>
      )}
      </div>

      {/* 문서 목록 (즐겨찾기 + 최근 문서 / 검색 결과) */}
      <div className="flex-1 overflow-auto hide-scrollbar" style={{ padding: "4px 0" }}>

        {/* 즐겨찾기 섹션 (검색 중에는 숨김) */}
        {!searchQuery && !selectedTags.length && favoriteFiles.length > 0 && (
          <>
            <div
              onClick={() => setFavExpanded(!favExpanded)}
              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 16px", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
            >
              <ChevronRight size={10} style={{ color: "var(--color-text-light)", transition: "transform 0.15s", transform: favExpanded ? "rotate(90deg)" : "" }} />
              <Star size={12} style={{ color: "#f5c518", fill: "#f5c518" }} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                즐겨찾기
              </span>
              <span style={{ fontSize: "10px", color: "var(--color-text-light)" }}>({favoriteFiles.length})</span>
            </div>
            {favExpanded && favoriteFiles.map((fp) => renderFileItem(fp))}
          </>
        )}

        {/* 최근 문서 섹션 (검색/태그 필터 없을 때) */}
        {!selectedTags.length && !searchQuery && (
          <>
            {favoriteFiles.length > 0 && <div style={{ height: "1px", background: "var(--color-border-light)", margin: "4px 16px" }} />}
            <div
              onClick={() => setRecentExpanded(!recentExpanded)}
              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 16px", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
            >
              <ChevronRight size={10} style={{ color: "var(--color-text-light)", transition: "transform 0.15s", transform: recentExpanded ? "rotate(90deg)" : "" }} />
              <Clock size={12} style={{ color: "var(--color-text-light)" }} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                최근 문서
              </span>
            </div>
          </>
        )}
        {/* 최근 문서 / 검색 결과 / 태그 필터 결과 */}
        {(!selectedTags.length && !searchQuery ? recentExpanded : true) && (
          displayFiles.length > 0 ? (
            displayFiles.map((fp) => renderFileItem(fp))
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px", color: "var(--color-text-light)", fontSize: "12px" }}>
              {searchQuery || selectedTags.length > 0 ? "검색 결과 없음" : "문서 없음"}
            </div>
          )
        )}
      </div>

      {/* 태그 전체 삭제 확인 */}
      {deleteConfirmTag && (
        <div onClick={() => setDeleteConfirmTag(null)} style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "start", justifyContent: "center", paddingTop: "120px", background: "rgba(0,0,0,0.35)", animation: "fadeIn 0.15s ease-out" }}>
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
