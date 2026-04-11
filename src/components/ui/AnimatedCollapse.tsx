import { useRef, useState, useEffect } from "react";

interface AnimatedCollapseProps {
  open: boolean;
  children: React.ReactNode;
  duration?: number;
}

export function AnimatedCollapse({ open, children, duration = 250 }: AnimatedCollapseProps) {
  const [shouldRender, setShouldRender] = useState(open);
  const [phase, setPhase] = useState<"idle" | "entering" | "exiting">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);

    if (open) {
      setShouldRender(true);
      setPhase("entering");
      // 다음 프레임에서 entering → idle (트랜지션 트리거)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase("idle");
        });
      });
    } else if (shouldRender) {
      setPhase("exiting");
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        setPhase("idle");
      }, duration);
    }
  }, [open]);

  if (!shouldRender) return null;

  const style: React.CSSProperties = phase === "entering"
    ? { opacity: 0, transform: "translateY(-8px)", overflow: "hidden" }
    : phase === "exiting"
    ? { opacity: 0, transform: "translateY(-8px)", overflow: "hidden", transition: `opacity ${duration}ms ease, transform ${duration}ms ease` }
    : { opacity: 1, transform: "translateY(0)", transition: `opacity ${duration}ms ease, transform ${duration}ms ease` };

  return <div style={style}>{children}</div>;
}
