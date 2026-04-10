import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { getTagColor } from "@/utils/frontmatter";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { FileText, Search, X } from "lucide-react";

export function TagExplorer() {
  const { allTags, openTab, tabs, activeTabId, recentFiles } = useAppStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const selectedTags = activeTab?.tagFilters ?? [];
  const [searchQuery, setSearchQuery] = useState("");

  const tagNames = Object.keys(allTags).sort();

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
    // 선택된 모든 태그를 가진 파일 (교집합)
    matchingFiles = allFiles.filter((fp) =>
      selectedTags.every((tag) => allTags[tag]?.includes(fp))
    );
  } else {
    // 태그 미선택 시 최근 수정 파일 순서
    matchingFiles = recentFiles.length > 0 ? recentFiles : allFiles;
  }

  // 검색어 필터
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    matchingFiles = matchingFiles.filter((fp) =>
      (fp.split("\\").pop() ?? "").toLowerCase().includes(q)
    );
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

  const shortenPath = (path: string) => {
    const m = path.match(/^([A-Z]:\\Users\\[^\\]+)/i);
    return m ? path.replace(m[1], "~") : path;
  };

  // 태그 전체 삭제
  const [deleteConfirmTag, setDeleteConfirmTag] = useState<string | null>(null);
  const handleDeleteTag = async (tag: string) => {
    const { readTextFile: readFile, writeTextFile: writeFile } = await import("@tauri-apps/plugin-fs");
    const { parseFrontmatter, updateFrontmatterTags } = await import("@/utils/frontmatter");
    const paths = allTags[tag] ?? [];
    const state = useAppStore.getState();
    for (const path of paths) {
      try {
        const content = await readFile(path);
        const fm = parseFrontmatter(content);
        const newTags = fm.tags.filter((t) => t !== tag);
        const newContent = updateFrontmatterTags(content, newTags);
        await writeFile(path, newContent);
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
      {/* 검색창 */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "0 16px", height: "40px",
        borderBottom: "1px solid var(--color-border-light)",
        flexShrink: 0,
      }}>
        <Search size={13} style={{ color: "var(--color-text-light)", flexShrink: 0 }} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="파일 검색"
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            fontSize: "12px", color: "var(--color-text-primary)",
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
        display: "flex", flexWrap: "wrap", gap: "5px",
        padding: "10px 16px", borderBottom: "1px solid var(--color-border-light)",
        flexShrink: 0,
      }}>
        {tagNames.map((tag) => {
          const color = getTagColor(tag);
          const isSelected = selectedTags.includes(tag);
          return (
            <span
              key={tag}
              style={{
                display: "inline-flex", alignItems: "center", gap: "3px",
                padding: "2px 8px", borderRadius: "3px", fontSize: "11px", fontWeight: 500,
                background: isSelected ? color.text : color.bg,
                color: isSelected ? "#fff" : color.text,
                cursor: "pointer", transition: "all 0.1s",
              }}
            >
              <span onClick={() => toggleTag(tag)}>
                {tag} <span style={{ opacity: 0.7, fontSize: "10px" }}>({allTags[tag]?.length ?? 0})</span>
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConfirmTag(tag); }}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: isSelected ? "#fff" : color.text, padding: 0, display: "flex", opacity: 0.5 }}
              >
                <X size={10} />
              </button>
            </span>
          );
        })}
      </div>
      )}

      {/* 문서 목록 */}
      <div className="flex-1 overflow-auto hide-scrollbar" style={{ padding: "4px 0" }}>
        {!selectedTags.length && !searchQuery && (
          <div style={{ padding: "6px 16px", fontSize: "10px", color: "var(--color-text-light)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            최근 문서
          </div>
        )}
        {displayFiles.length > 0 ? (
          displayFiles.map((filePath) => {
            const name = filePath.split("\\").pop() ?? "";
            const path = shortenPath(filePath.substring(0, filePath.lastIndexOf("\\")));
            const fileTags = Object.keys(allTags).filter((t) => allTags[t]?.includes(filePath));
            return (
              <button
                key={filePath}
                onClick={() => handleOpenFile(filePath)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px", width: "100%",
                  padding: "6px 16px", border: "none", background: "transparent",
                  cursor: "pointer", textAlign: "left", transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <FileText size={13} style={{ color: "var(--color-text-light)", flexShrink: 0 }} />
                <div style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
                  <div className="truncate" style={{ fontSize: "13px", color: "var(--color-text-primary)", fontWeight: 500 }}>{name}</div>
                  <div className="truncate" style={{ fontSize: "10px", color: "var(--color-text-light)" }}>{path}</div>
                </div>
                {fileTags.length > 0 && (
                <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                  {fileTags.map((t) => {
                    const c = getTagColor(t);
                    return <span key={t} style={{ fontSize: "9px", padding: "1px 4px", borderRadius: "2px", background: c.bg, color: c.text }}>{t}</span>;
                  })}
                </div>
                )}
              </button>
            );
          })
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px", color: "var(--color-text-light)", fontSize: "12px" }}>
            {searchQuery || selectedTags.length > 0 ? "검색 결과 없음" : "태그된 문서 없음"}
          </div>
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
