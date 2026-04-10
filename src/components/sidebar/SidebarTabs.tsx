import { useState, useRef, useCallback } from "react";
import { FileText, Tags } from "lucide-react";

interface SidebarTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: "files", label: "Files", icon: FileText },
  { id: "tags", label: "Tags", icon: Tags },
];

export function SidebarTabs({ activeTab, onTabChange }: SidebarTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const handleHover = useCallback((el: HTMLElement | null) => {
    if (!el || !containerRef.current) {
      setHighlight(null);
      return;
    }
    const cr = containerRef.current.getBoundingClientRect();
    const br = el.getBoundingClientRect();
    setHighlight({ left: br.left - cr.left, top: br.top - cr.top, width: br.width, height: br.height });
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => setHighlight(null)}
      style={{ position: "relative", padding: "0 8px" }}
      className="flex items-center border-b border-border-light shrink-0"
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

      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <div
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onMouseEnter={(e) => handleHover(e.currentTarget)}
            style={{
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              flex: 1,
              cursor: "pointer",
              position: "relative",
              zIndex: 1,
              color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
              fontWeight: 600,
              fontSize: "12px",
              transition: "color 0.1s",
            }}
          >
            <Icon size={13} />
            {tab.label}

            {/* 미니멀 언더라인 */}
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
          </div>
        );
      })}
    </div>
  );
}
