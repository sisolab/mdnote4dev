import { useState, useRef, useCallback } from "react";

const DEMO_BUTTONS = ["H1", "H2", "H3", "B", "I", "S", "< >"];

interface ShowcaseToolbarProps {
  name: string;
  description: string;
  renderButton: (props: {
    label: string;
    isActive: boolean;
    onClick: () => void;
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => void;
  }) => React.ReactNode;
  renderHighlight?: (highlight: { left: number; top: number; width: number; height: number } | null) => React.ReactNode;
  containerStyle?: React.CSSProperties;
  containerClass?: string;
}

function ShowcaseToolbar({ name, description, renderButton, renderHighlight, containerStyle, containerClass }: ShowcaseToolbarProps) {
  const [active, setActive] = useState("B");
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const handleHover = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const br = e.currentTarget.getBoundingClientRect();
    setHighlight({ left: br.left - cr.left, top: br.top - cr.top, width: br.width, height: br.height });
  }, []);

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ marginBottom: "6px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#222" }}>{name}</span>
        <span style={{ fontSize: "11px", color: "#888", marginLeft: "8px" }}>{description}</span>
      </div>
      <div
        ref={containerRef}
        onMouseLeave={() => setHighlight(null)}
        style={{ display: "flex", alignItems: "center", gap: 0, padding: "8px 12px", borderRadius: "8px", border: "1px solid #eee", background: "#fafbfc", position: "relative", ...containerStyle }}
        className={containerClass}
      >
        {renderHighlight?.(highlight)}
        {DEMO_BUTTONS.map((label) => (
          <span key={label}>
            {renderButton({
              label,
              isActive: active === label,
              onClick: () => setActive(label),
              onMouseEnter: handleHover,
            })}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ToolbarShowcase({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "start", justifyContent: "center", paddingTop: "40px", background: "rgba(0,0,0,0.35)" }}>
      <div style={{ width: "680px", maxHeight: "calc(100vh - 80px)", background: "#fff", borderRadius: "12px", border: "1px solid #e0e0e0", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #eee" }}>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#222" }}>툴바 스타일 선택</span>
          <button onClick={onClose} style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#999", fontSize: "18px" }}>×</button>
        </div>
        <div style={{ padding: "20px" }}>

          {/* 1. 하단 라인 (현재) */}
          <ShowcaseToolbar
            name="1. 하단 라인"
            description="활성 시 하단 엑센트 라인"
            renderHighlight={(h) => (
              <div style={{
                position: "absolute", left: h ? h.left : 0, top: h ? h.top : 0,
                width: h ? h.width : 0, height: h ? h.height : 0,
                background: "#f0f1f3", borderRadius: "6px",
                transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                opacity: h ? 1 : 0, pointerEvents: "none", zIndex: 0,
              }} />
            )}
            renderButton={({ label, isActive, onClick, onMouseEnter }) => (
              <button onClick={onClick} onMouseEnter={onMouseEnter} style={{
                width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "6px", border: "none", background: isActive ? "rgba(26,115,232,0.08)" : "transparent",
                borderBottom: isActive ? "2px solid #1a73e8" : "2px solid transparent",
                color: isActive ? "#1a73e8" : "#555", fontWeight: 600, fontSize: "11px",
                cursor: "pointer", position: "relative", zIndex: 1, transition: "color 0.1s",
              }}>{label}</button>
            )}
          />

          {/* 2. 필 배경 */}
          <ShowcaseToolbar
            name="2. 필 배경"
            description="활성 시 엑센트 배경 채움"
            renderHighlight={(h) => (
              <div style={{
                position: "absolute", left: h ? h.left : 0, top: h ? h.top : 0,
                width: h ? h.width : 0, height: h ? h.height : 0,
                background: "rgba(0,0,0,0.04)", borderRadius: "6px",
                transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                opacity: h ? 1 : 0, pointerEvents: "none", zIndex: 0,
              }} />
            )}
            renderButton={({ label, isActive, onClick, onMouseEnter }) => (
              <button onClick={onClick} onMouseEnter={onMouseEnter} style={{
                width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "8px", border: "none",
                background: isActive ? "#1a73e8" : "transparent",
                color: isActive ? "#fff" : "#555", fontWeight: 600, fontSize: "11px",
                cursor: "pointer", position: "relative", zIndex: 1, transition: "all 0.15s",
              }}>{label}</button>
            )}
          />

          {/* 3. 좌측 라인 */}
          <ShowcaseToolbar
            name="3. 좌측 라인"
            description="활성 시 좌측 엑센트 바"
            renderHighlight={(h) => (
              <div style={{
                position: "absolute", left: h ? h.left : 0, top: h ? h.top : 0,
                width: h ? h.width : 0, height: h ? h.height : 0,
                background: "#eef1f5", borderRadius: "6px",
                transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                opacity: h ? 1 : 0, pointerEvents: "none", zIndex: 0,
              }} />
            )}
            renderButton={({ label, isActive, onClick, onMouseEnter }) => (
              <button onClick={onClick} onMouseEnter={onMouseEnter} style={{
                width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "6px", border: "none",
                background: isActive ? "rgba(26,115,232,0.08)" : "transparent",
                borderLeft: isActive ? "2.5px solid #1a73e8" : "2.5px solid transparent",
                color: isActive ? "#1a73e8" : "#555", fontWeight: 600, fontSize: "11px",
                cursor: "pointer", position: "relative", zIndex: 1, transition: "all 0.1s",
              }}>{label}</button>
            )}
          />

          {/* 4. 글로우 */}
          <ShowcaseToolbar
            name="4. 글로우"
            description="활성 시 은은한 발광 효과"
            renderHighlight={(h) => (
              <div style={{
                position: "absolute", left: h ? h.left - 2 : 0, top: h ? h.top - 2 : 0,
                width: h ? h.width + 4 : 0, height: h ? h.height + 4 : 0,
                background: "rgba(26,115,232,0.06)", borderRadius: "10px",
                boxShadow: "0 0 12px rgba(26,115,232,0.15)",
                transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                opacity: h ? 1 : 0, pointerEvents: "none", zIndex: 0,
              }} />
            )}
            renderButton={({ label, isActive, onClick, onMouseEnter }) => (
              <button onClick={onClick} onMouseEnter={onMouseEnter} style={{
                width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "8px", border: "none",
                background: isActive ? "rgba(26,115,232,0.1)" : "transparent",
                boxShadow: isActive ? "0 0 8px rgba(26,115,232,0.3)" : "none",
                color: isActive ? "#1a73e8" : "#555", fontWeight: 600, fontSize: "11px",
                cursor: "pointer", position: "relative", zIndex: 1, transition: "all 0.15s",
              }}>{label}</button>
            )}
          />

          {/* 5. 피 배경 + 도트 */}
          <ShowcaseToolbar
            name="5. 도트 인디케이터"
            description="활성 시 하단 도트"
            renderHighlight={(h) => (
              <div style={{
                position: "absolute", left: h ? h.left : 0, top: h ? h.top : 0,
                width: h ? h.width : 0, height: h ? h.height : 0,
                background: "#f0f1f3", borderRadius: "6px",
                transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                opacity: h ? 1 : 0, pointerEvents: "none", zIndex: 0,
              }} />
            )}
            renderButton={({ label, isActive, onClick, onMouseEnter }) => (
              <button onClick={onClick} onMouseEnter={onMouseEnter} style={{
                width: "34px", height: "38px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: "3px", borderRadius: "6px", border: "none", background: "transparent",
                color: isActive ? "#1a73e8" : "#555", fontWeight: 600, fontSize: "11px",
                cursor: "pointer", position: "relative", zIndex: 1, transition: "color 0.1s",
              }}>
                {label}
                <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: isActive ? "#1a73e8" : "transparent", transition: "all 0.2s" }} />
              </button>
            )}
          />

          {/* 6. 아웃라인 */}
          <ShowcaseToolbar
            name="6. 아웃라인"
            description="활성 시 엑센트 테두리"
            renderHighlight={(h) => (
              <div style={{
                position: "absolute", left: h ? h.left : 0, top: h ? h.top : 0,
                width: h ? h.width : 0, height: h ? h.height : 0,
                background: "rgba(0,0,0,0.03)", borderRadius: "6px",
                transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                opacity: h ? 1 : 0, pointerEvents: "none", zIndex: 0,
              }} />
            )}
            renderButton={({ label, isActive, onClick, onMouseEnter }) => (
              <button onClick={onClick} onMouseEnter={onMouseEnter} style={{
                width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "8px",
                border: isActive ? "1.5px solid #1a73e8" : "1.5px solid transparent",
                background: isActive ? "rgba(26,115,232,0.04)" : "transparent",
                color: isActive ? "#1a73e8" : "#555", fontWeight: 600, fontSize: "11px",
                cursor: "pointer", position: "relative", zIndex: 1, transition: "all 0.15s",
              }}>{label}</button>
            )}
          />

          {/* 7. 슬라이딩 필 */}
          <ShowcaseToolbar
            name="7. 슬라이딩 필"
            description="호버가 엑센트 컬러로 채워짐"
            renderHighlight={(h) => (
              <div style={{
                position: "absolute", left: h ? h.left : 0, top: h ? h.top : 0,
                width: h ? h.width : 0, height: h ? h.height : 0,
                background: "rgba(26,115,232,0.08)", borderRadius: "6px",
                transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                opacity: h ? 1 : 0, pointerEvents: "none", zIndex: 0,
              }} />
            )}
            renderButton={({ label, isActive, onClick, onMouseEnter }) => (
              <button onClick={onClick} onMouseEnter={onMouseEnter} style={{
                width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "6px", border: "none",
                background: isActive ? "#1a73e8" : "transparent",
                color: isActive ? "#fff" : "#555", fontWeight: isActive ? 700 : 600, fontSize: "11px",
                cursor: "pointer", position: "relative", zIndex: 1,
                transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                boxShadow: isActive ? "0 2px 6px rgba(26,115,232,0.3)" : "none",
              }}>{label}</button>
            )}
          />

          {/* 8. 미니멀 언더라인 */}
          <ShowcaseToolbar
            name="8. 미니멀 언더라인"
            description="활성 시 짧은 하단 라인만"
            renderHighlight={(h) => (
              <div style={{
                position: "absolute", left: h ? h.left : 0, top: h ? h.top : 0,
                width: h ? h.width : 0, height: h ? h.height : 0,
                background: "#f5f5f5", borderRadius: "6px",
                transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                opacity: h ? 1 : 0, pointerEvents: "none", zIndex: 0,
              }} />
            )}
            renderButton={({ label, isActive, onClick, onMouseEnter }) => (
              <button onClick={onClick} onMouseEnter={onMouseEnter} style={{
                width: "34px", height: "38px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: "4px", borderRadius: "6px", border: "none", background: "transparent",
                color: isActive ? "#1a73e8" : "#555", fontWeight: 600, fontSize: "11px",
                cursor: "pointer", position: "relative", zIndex: 1, transition: "color 0.1s",
              }}>
                {label}
                <div style={{ width: isActive ? "14px" : "0px", height: "2px", borderRadius: "1px", background: "#1a73e8", transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)" }} />
              </button>
            )}
          />

          {/* 9. 그라데이션 글래스 */}
          <ShowcaseToolbar
            name="9. 글래스모피즘"
            description="호버 시 유리 효과, 활성 시 반투명 엑센트"
            containerStyle={{ background: "linear-gradient(135deg, #f0f2f5, #e8edf2)" }}
            renderHighlight={(h) => (
              <div style={{
                position: "absolute", left: h ? h.left - 1 : 0, top: h ? h.top - 1 : 0,
                width: h ? h.width + 2 : 0, height: h ? h.height + 2 : 0,
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(4px)", borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.5)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                opacity: h ? 1 : 0, pointerEvents: "none", zIndex: 0,
              }} />
            )}
            renderButton={({ label, isActive, onClick, onMouseEnter }) => (
              <button onClick={onClick} onMouseEnter={onMouseEnter} style={{
                width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "8px", border: isActive ? "1px solid rgba(26,115,232,0.3)" : "1px solid transparent",
                background: isActive ? "rgba(26,115,232,0.12)" : "transparent",
                backdropFilter: isActive ? "blur(4px)" : "none",
                color: isActive ? "#1a73e8" : "#555", fontWeight: 600, fontSize: "11px",
                cursor: "pointer", position: "relative", zIndex: 1, transition: "all 0.15s",
              }}>{label}</button>
            )}
          />

          {/* 10. 네온 */}
          <ShowcaseToolbar
            name="10. 네온 엣지"
            description="활성 시 네온 테두리 + 글로우"
            containerStyle={{ background: "#1a1a2e", borderColor: "#2a2a4a" }}
            renderHighlight={(h) => (
              <div style={{
                position: "absolute", left: h ? h.left : 0, top: h ? h.top : 0,
                width: h ? h.width : 0, height: h ? h.height : 0,
                background: "rgba(255,255,255,0.05)", borderRadius: "6px",
                transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                opacity: h ? 1 : 0, pointerEvents: "none", zIndex: 0,
              }} />
            )}
            renderButton={({ label, isActive, onClick, onMouseEnter }) => (
              <button onClick={onClick} onMouseEnter={onMouseEnter} style={{
                width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "6px",
                border: isActive ? "1px solid rgba(100,180,255,0.6)" : "1px solid transparent",
                background: isActive ? "rgba(100,180,255,0.08)" : "transparent",
                boxShadow: isActive ? "0 0 10px rgba(100,180,255,0.25), inset 0 0 6px rgba(100,180,255,0.08)" : "none",
                color: isActive ? "#7eb8ff" : "#888", fontWeight: 600, fontSize: "11px",
                cursor: "pointer", position: "relative", zIndex: 1, transition: "all 0.2s",
              }}>{label}</button>
            )}
          />

        </div>
      </div>
    </div>
  );
}
