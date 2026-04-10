import { useState, useRef, useCallback } from "react";

interface TooltipProps {
  text: string;
  delay?: number;
  children: React.ReactNode;
}

export function Tooltip({ text, delay = 1000, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const resetTimer = useCallback((e: React.MouseEvent) => {
    clearTimeout(timer.current);
    setVisible(false);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: rect.left, y: rect.top - 28 });
    timer.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    resetTimer(e);
  }, [resetTimer]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!visible) resetTimer(e);
  }, [visible, resetTimer]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(timer.current);
    setVisible(false);
  }, []);

  return (
    <div onMouseEnter={handleMouseEnter} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {children}
      {visible && (
        <div style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 300,
          padding: "4px 10px",
          fontSize: "11px",
          fontWeight: 500,
          color: "#fff",
          background: "rgba(30, 30, 30, 0.9)",
          backdropFilter: "blur(4px)",
          borderRadius: "4px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          animation: "fadeIn 0.1s ease-out",
        }}>
          {text}
        </div>
      )}
    </div>
  );
}
