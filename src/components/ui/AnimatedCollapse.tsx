import { useRef, useState, useEffect } from "react";

interface AnimatedCollapseProps {
  open: boolean;
  children: React.ReactNode;
  duration?: number;
}

const DURATION = 300;

export function AnimatedCollapse({ open, children, duration = DURATION }: AnimatedCollapseProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [render, setRender] = useState(open);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const outer = outerRef.current;

    if (open) {
      setRender(true);
    } else if (outer) {
      // 접기: 현재 높이 → 0
      const h = outer.scrollHeight;
      outer.style.height = `${h}px`;
      outer.style.overflow = "hidden";
      requestAnimationFrame(() => {
        outer.style.transition = `height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        outer.style.height = "0px";
        setTimeout(() => {
          setRender(false);
          outer.style.transition = "";
          outer.style.height = "";
          outer.style.overflow = "";
        }, duration);
      });
    }
  }, [open, duration]);

  // 펼치기: render 직후 0 → 실제 높이
  useEffect(() => {
    if (!render || !open || !mounted.current) return;
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    outer.style.height = "0px";
    outer.style.overflow = "hidden";
    outer.style.transition = "none";

    requestAnimationFrame(() => {
      const h = inner.scrollHeight;
      requestAnimationFrame(() => {
        outer.style.transition = `height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        outer.style.height = `${h}px`;
        setTimeout(() => {
          outer.style.height = "";
          outer.style.overflow = "";
          outer.style.transition = "";
        }, duration);
      });
    });
  }, [render, open, duration]);

  if (!render) return null;

  return (
    <div ref={outerRef}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
