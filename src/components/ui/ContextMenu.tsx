import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
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
    if (rect.bottom > window.innerHeight) {
      menuRef.current.style.top = `${window.innerHeight - rect.height - 4}px`;
    }
  }, []);

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 200,
        minWidth: "160px",
        background: "rgba(255,255,255,0.98)",
        backdropFilter: "blur(8px)",
        border: "1px solid #e0e0e0",
        borderRadius: "6px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
        padding: "4px 4px",
        animation: "fadeIn 0.1s ease-out",
      }}
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} style={{ height: "1px", background: "#eee", margin: "4px 8px" }} />
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
              color: item.disabled ? "#bbb" : item.danger ? "#e53935" : "#333",
              cursor: item.disabled ? "default" : "pointer",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) e.currentTarget.style.background = "#f0f1f3";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
