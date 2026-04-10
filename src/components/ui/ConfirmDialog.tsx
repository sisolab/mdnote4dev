interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = "확인", cancelLabel = "취소", confirmDanger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "start", justifyContent: "center", paddingTop: "120px",
        background: "rgba(0,0,0,0.35)", animation: "fadeIn 0.15s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "360px", background: "var(--color-bg-elevated)", borderRadius: "12px",
          border: "1px solid var(--color-border-medium)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: "24px", animation: "fadeIn 0.15s ease-out",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-heading)", marginBottom: "8px" }}>
          {title}
        </div>
        <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "20px", lineHeight: 1.6 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "6px 16px", fontSize: "12px", fontWeight: 500,
              background: "var(--color-bg-hover)", color: "var(--color-text-primary)",
              border: "none", borderRadius: "6px", cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "6px 16px", fontSize: "12px", fontWeight: 600,
              background: confirmDanger ? "#e53935" : "var(--color-accent)",
              color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
