import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Star } from "lucide-react";

const DEFAULT_PINNED = ["python", "javascript", "bash"];
const STORAGE_KEY = "marknote-code-lang-pinned";

function getPinned(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [...DEFAULT_PINNED];
  } catch {
    return [...DEFAULT_PINNED];
  }
}

function savePinned(pinned: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pinned));
}

const LANGUAGES = [
  "arduino", "bash", "c", "cpp", "csharp", "css", "diff", "go", "graphql",
  "html", "ini", "java", "javascript", "json", "kotlin", "less", "lua",
  "makefile", "markdown", "objectivec", "perl", "php", "plaintext", "python",
  "r", "ruby", "rust", "scss", "shell", "sql", "swift", "typescript",
  "vbnet", "wasm", "xml", "yaml",
];

export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const language = node.attrs.language as string || "";
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState(language);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [pinned, setPinned] = useState(getPinned);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const togglePin = useCallback((lang: string) => {
    setPinned((prev) => {
      const next = prev.includes(lang)
        ? prev.filter((l) => l !== lang)
        : [...prev, lang];
      savePinned(next);
      return next;
    });
  }, []);

  const filtered = query
    ? LANGUAGES.filter((l) => l.includes(query.toLowerCase()))
    : [...pinned, "---", ...LANGUAGES.filter((l) => !pinned.includes(l))];

  const selectableItems = filtered.filter((l) => l !== "---");

  useEffect(() => { setQuery(language); }, [language]);
  useEffect(() => { setSelectedIdx(0); }, [query]);

  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node) &&
          listRef.current && !listRef.current.contains(e.target as Node)) {
        setEditing(false);
        setQuery(language);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [editing, language]);

  const selectLanguage = useCallback((lang: string) => {
    updateAttributes({ language: lang });
    setQuery(lang);
    setEditing(false);
  }, [updateAttributes]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, selectableItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectableItems[selectedIdx]) selectLanguage(selectableItems[selectedIdx]);
    } else if (e.key === "Escape") {
      setEditing(false);
      setQuery(language);
    }
  };

  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector("[data-active]") as HTMLElement | null;
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  return (
    <NodeViewWrapper className="code-block" style={{ position: "relative" }}>
      <div
        style={{ position: "absolute", top: "6px", right: "8px", zIndex: 10 }}
        contentEditable={false}
      >
        {editing ? (
          <div style={{ position: "relative" }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value.toLowerCase())}
              onKeyDown={handleKeyDown}
              autoFocus
              spellCheck={false}
              style={{
                width: "90px", padding: "2px 8px", fontSize: "11px", textAlign: "right",
                fontFamily: "inherit", background: "rgba(255,255,255,0.1)",
                border: "none", borderRadius: "4px",
                color: "#cdd6f4", outline: "none",
              }}
            />
            {filtered.length > 0 && (
              <div
                ref={listRef}
                style={{
                  position: "absolute", top: "100%", right: 0, marginTop: "4px",
                  width: "170px", maxHeight: "200px", overflowY: "auto",
                  background: "#2a2a3e", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  padding: "4px",
                }}
              >
                {filtered.map((lang) => lang === "---" ? (
                  <div key="---" style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "4px 8px" }} />
                ) : (
                  <div
                    key={lang}
                    {...(selectableItems[selectedIdx] === lang ? { "data-active": true } : {})}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "4px 8px", fontSize: "11px", borderRadius: "3px", cursor: "pointer",
                      color: selectableItems[selectedIdx] === lang ? "#cdd6f4" : "#9399b2",
                      background: selectableItems[selectedIdx] === lang ? "rgba(255,255,255,0.1)" : "transparent",
                    }}
                  >
                    <span onMouseDown={(e) => { e.preventDefault(); selectLanguage(lang); }} style={{ flex: 1 }}>
                      {lang}
                    </span>
                    <Star
                      size={11}
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(lang); }}
                      style={{
                        flexShrink: 0, cursor: "pointer",
                        color: pinned.includes(lang) ? "#f5c518" : "#6c7086",
                        fill: pinned.includes(lang) ? "#f5c518" : "none",
                        transition: "all 0.15s",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => { setEditing(true); setQuery(""); }}
            style={{
              width: "90px", textAlign: "right",
              padding: "2px 8px", fontSize: "11px", fontFamily: "inherit",
              background: "transparent", border: "none", borderRadius: "4px",
              color: language ? "#9399b2" : "#6c7086",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {language || "language"}
          </button>
        )}
      </div>

      <pre>
        <NodeViewContent as={"code" as any} />
      </pre>
    </NodeViewWrapper>
  );
}
