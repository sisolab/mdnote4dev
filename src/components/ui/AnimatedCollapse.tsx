import { useRef, useState, useEffect, useLayoutEffect } from "react";

interface AnimatedCollapseProps {
  open: boolean;
  children: React.ReactNode;
  duration?: number;
}

const DURATION = 400;

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

    if (open) {
      setRender(true);
    } else {
      // 접기
      const outer = outerRef.current;
      if (!outer) return;
      const h = outer.scrollHeight;
      outer.style.height = `${h}px`;
      outer.style.overflow = "hidden";
      requestAnimationFrame(() => {
        outer.style.transition = `height ${duration}ms ease-out`;
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

  // 펼치기: render 직후 바로 애니메이션 (접기와 동일한 패턴)
  useLayoutEffect(() => {
    if (!render || !open || !mounted.current) return;
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const h = inner.scrollHeight;
    outer.style.height = "0px";
    outer.style.overflow = "hidden";
    outer.style.transition = "none";

    requestAnimationFrame(() => {
      outer.style.transition = `height ${duration}ms ease-out`;
      outer.style.height = `${h}px`;
      setTimeout(() => {
        outer.style.height = "";
        outer.style.overflow = "";
        outer.style.transition = "";
      }, duration);
    });
  }, [render]);

  if (!render) return null;

  return (
    <div ref={outerRef}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
