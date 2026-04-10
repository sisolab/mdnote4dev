import { useState, useEffect } from "react";
import { icons } from "lucide-react";
import { RotateCcw } from "lucide-react";

const ICON_LIST = [
  "Folder", "FolderOpen", "BookOpen", "Book", "Code", "FileText", "Database",
  "Globe", "Music", "Image", "Video", "Archive", "Briefcase", "GraduationCap",
  "Heart", "Home", "Laptop", "Lightbulb", "Mail", "Map", "Palette", "Rocket",
  "Settings", "ShoppingBag", "Star", "Terminal", "Wrench", "Gamepad2",
  "FlaskConical", "PenTool", "Camera", "Coffee", "Zap", "Shield", "Clock",
  "Users", "MessageSquare", "Bookmark", "Flag", "Gift", "Key", "Layers",
  "Package", "Scissors", "Target", "Truck", "Umbrella", "Wifi",
];

export function IconPicker({
  currentIcon,
  onSelect,
  onClose,
}: {
  currentIcon?: string;
  onSelect: (icon: string | undefined) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = search
    ? ICON_LIST.filter((name) => name.toLowerCase().includes(search.toLowerCase()))
    : ICON_LIST;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.35)", animation: "fadeIn 0.15s ease-out",
        display: "flex", alignItems: "start", justifyContent: "center", paddingTop: "80px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "400px", maxHeight: "440px",
          background: "var(--color-bg-elevated)", borderRadius: "12px",
          border: "1px solid var(--color-border-medium)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--color-border-light)" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-heading)" }}>아이콘 변경</span>
          <button
            onClick={() => { onSelect(undefined); onClose(); }}
            title="기본값으로"
            style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--color-text-tertiary)", background: "transparent", border: "none", cursor: "pointer" }}
          >
            <RotateCcw size={11} /> 기본값
          </button>
        </div>

        {/* 검색 */}
        <div style={{ padding: "10px 20px" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="아이콘 검색..."
            autoFocus
            style={{
              width: "100%", padding: "6px 10px", fontSize: "12px",
              border: "1px solid var(--color-border-input)", borderRadius: "6px",
              background: "var(--color-bg-primary)", color: "var(--color-text-primary)",
              outline: "none",
            }}
          />
        </div>

        {/* 아이콘 그리드 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 16px", display: "flex", flexWrap: "wrap", gap: "4px", alignContent: "start" }}>
          {filtered.map((name) => {
            const Icon = icons[name as keyof typeof icons];
            if (!Icon) return null;
            const isSelected = currentIcon === name;
            return (
              <button
                key={name}
                onClick={() => { onSelect(name); onClose(); }}
                title={name}
                style={{
                  width: "40px", height: "40px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "6px", border: "none", cursor: "pointer",
                  background: isSelected ? "var(--color-accent-subtle)" : "transparent",
                  color: isSelected ? "var(--color-accent)" : "var(--color-text-secondary)",
                  transition: "all 0.1s",
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--color-bg-hover)"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <Icon size={18} />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ width: "100%", textAlign: "center", padding: "20px", color: "var(--color-text-light)", fontSize: "12px" }}>
              검색 결과 없음
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
