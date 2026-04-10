import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  header?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  anchorBottom?: boolean;
}

export function ContextMenu({ x, y, items, onClose, anchorBottom }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", handler);
    window.addEventListener("keydown", escHandler);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", escHandler);
    };
  }, [onClose]);

  // 화면 밖으로 안 나가게 위치 조정
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menuRef.current.style.left = `${window.innerWidth - rect.width - 4}px`;
    }
    if (anchorBottom) {
      menuRef.current.style.top = `${y - rect.height}px`;
    } else if (rect.bottom > window.innerHeight) {
      menuRef.current.style.top = `${window.innerHeight - rect.height - 4}px`;
    }
  }, []);

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 200,
        minWidth: "160px",
        background: "var(--color-bg-frosted)",
        backdropFilter: "blur(8px)",
        border: "1px solid var(--color-border-medium)",
        borderRadius: "6px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
        padding: "4px 4px",
        animation: "fadeIn 0.1s ease-out",
      }}
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} style={{ height: "1px", background: "var(--color-border-light)", margin: "4px 8px" }} />
        ) : item.header ? (
          <div key={i} style={{ padding: "6px 12px 2px", fontSize: "10px", fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {item.label}
          </div>
        ) : (
          <button
            key={i}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 12px",
              borderRadius: "3px",
              border: "none",
              background: "transparent",
              textAlign: "left",
              fontSize: "12px",
              fontWeight: 500,
              color: item.disabled ? "var(--color-text-muted)" : item.danger ? "#e53935" : "var(--color-text-primary)",
              cursor: item.disabled ? "default" : "pointer",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) e.currentTarget.style.background = "var(--color-bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {item.label}
          </button>
        )
      )}
    </div>,
    document.body
  );
}
