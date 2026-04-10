import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getTagColor, getTagColorDark } from "@/utils/frontmatter";
import { X, Tag, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { shortenPath } from "@/utils/pathUtils";

interface StatusBarProps {
  filePath: string | null;
  fileSize: number;
  lineCount: number;
  charCount: number;
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export function StatusBar({ filePath, fileSize, lineCount, charCount, tags: propTags, onAddTag, onRemoveTag }: StatusBarProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { allTags } = useAppStore();
  // 실시간 동기화: allTags에서 현재 파일의 태그를 직접 계산
  const tags = filePath
    ? Object.keys(allTags).filter((tag) => allTags[tag]?.includes(filePath))
    : propTags;
  const { themeMode } = useSettingsStore();
  const isDark = themeMode === "dark" || themeMode === "charcoal";

  // 모든 태그 이름 (사용 빈도순)
  const allTagNames = Object.keys(allTags).sort((a, b) => (allTags[b]?.length ?? 0) - (allTags[a]?.length ?? 0));

  // 추천 목록: 입력 있으면 필터링, 없으면 최근(빈도순) 5개
  const suggestions = (input
    ? allTagNames.filter((t) => t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t)).slice(0, 8)
    : allTagNames.filter((t) => !tags.includes(t)).slice(0, 5)
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim().toLowerCase();

    if (suggestions.length > 0 && selectedIndex < suggestions.length) {
      onAddTag(suggestions[selectedIndex]);
    } else if (trimmed && !tags.includes(trimmed)) {
      onAddTag(trimmed);
    }
    setInput("");
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(suggestions.length - 1, i + 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setInput("");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getColor = (tag: string) => isDark ? getTagColorDark(tag) : getTagColor(tag);
  const [collapsed, setCollapsed] = useState(false);

  if (!filePath) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: "absolute", right: "16px", bottom: "8px",
          border: "none", background: "transparent", cursor: "pointer",
          color: "var(--color-accent)", padding: 0, display: "flex", zIndex: 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-accent-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-accent)"; }}
        title="상태바 표시"
      >
        <ChevronUp size={13} strokeWidth={3} />
      </button>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center",
      height: "34px", padding: "0 16px",
      borderTop: "1px solid var(--color-border-light)",
      fontSize: "12px", color: "var(--color-text-primary)",
      flexShrink: 0, gap: "12px",
    }}>
      {/* 파일 정보 */}
      <span className="truncate" style={{ maxWidth: "180px" }}>{shortenPath(filePath)}</span>
      <button
        onClick={() => invoke("open_in_explorer", { path: filePath.substring(0, filePath.lastIndexOf("\\")) })}
        style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-light)", padding: 0, display: "flex", flexShrink: 0 }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-light)"; }}
        title="폴더 열기"
      >
        <FolderOpen size={12} />
      </button>
      <div style={{ width: "1px", height: "14px", background: "var(--color-border-light)", flexShrink: 0 }} />
      <span>{formatSize(fileSize)}</span>
      <div style={{ width: "1px", height: "14px", background: "var(--color-border-light)", flexShrink: 0 }} />
      <span>{lineCount} 줄</span>
      <div style={{ width: "1px", height: "14px", background: "var(--color-border-light)", flexShrink: 0 }} />
      <span>{charCount} 자</span>
      <div style={{ width: "1px", height: "14px", background: "var(--color-border-light)", flexShrink: 0 }} />

      {/* 태그 아이콘 */}
      <Tag size={11} style={{ flexShrink: 0 }} />

      {/* 등록된 태그들 */}
      {tags.map((tag) => {
        const color = getColor(tag);
        return (
          <span
            key={tag}
            style={{
              display: "inline-flex", alignItems: "center", gap: "3px",
              padding: "2px 8px", borderRadius: "3px", fontSize: "11px", fontWeight: 500,
              background: color.bg, color: color.text, flexShrink: 0,
            }}
          >
            {tag}
            <button
              onClick={() => onRemoveTag(tag)}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: color.text, padding: 0, display: "flex" }}
            >
              <X size={10} />
            </button>
          </span>
        );
      })}

      {/* 태그 입력란 */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="+ 태그"
          style={{
            width: "70px", border: "none", outline: "none", background: "transparent",
            fontSize: "12px", color: "var(--color-text-primary)", padding: "0 4px",
          }}
        />

        {/* 자동완성 드롭다운 (위로 뜸) */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: "absolute", bottom: "24px", left: 0,
            minWidth: "160px", maxHeight: "180px", overflowY: "auto",
            background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-medium)",
            borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            padding: "4px", zIndex: 100,
          }}>
            {!input && (
              <div style={{ padding: "3px 8px", fontSize: "10px", color: "var(--color-text-light)", fontWeight: 600 }}>
                최근 태그
              </div>
            )}
            {suggestions.map((s, i) => {
              const color = getColor(s);
              return (
                <div
                  key={s}
                  onMouseDown={() => { onAddTag(s); setInput(""); setShowSuggestions(false); }}
                  style={{
                    padding: "4px 8px", fontSize: "11px", cursor: "pointer",
                    borderRadius: "3px", display: "flex", alignItems: "center", gap: "6px",
                    background: i === selectedIndex ? "var(--color-bg-hover)" : "transparent",
                  }}
                >
                  <span style={{
                    width: "8px", height: "8px", borderRadius: "2px",
                    background: color.bg, border: `1px solid ${color.text}`,
                    flexShrink: 0,
                  }} />
                  <span style={{ color: "var(--color-text-primary)" }}>{s}</span>
                  <span style={{ color: "var(--color-text-light)", marginLeft: "auto", fontSize: "10px" }}>
                    {allTags[s]?.length ?? 0}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 숨기기 버튼 */}
      <div style={{ marginLeft: "auto", flexShrink: 0 }}>
        <button
          onClick={() => setCollapsed(true)}
          style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-accent)", padding: 0, display: "flex" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-accent-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-accent)"; }}
          title="상태바 숨기기"
        >
          <ChevronDown size={13} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
