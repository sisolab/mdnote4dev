import { useRef, useState, useEffect } from "react";

interface AnimatedCollapseProps {
  open: boolean;
  children: React.ReactNode;
  duration?: number;
}

const DURATION = 300; // 고정 duration으로 일관된 속도감

export function AnimatedCollapse({ open, children, duration = DURATION }: AnimatedCollapseProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [render, setRender] = useState(open);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const el = ref.current;

    if (open) {
      setRender(true);
    } else if (el) {
      // 접기: clip-path로 위에서부터 숨기기
      el.style.transition = `clip-path ${duration}ms ease, opacity ${duration}ms ease`;
      el.style.clipPath = "inset(0 0 100% 0)";
      el.style.opacity = "0.3";
      const timer = setTimeout(() => {
        setRender(false);
        if (el) {
          el.style.transition = "";
          el.style.clipPath = "";
          el.style.opacity = "";
        }
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration]);

  // 펼치기: render 된 직후 애니메이션
  useEffect(() => {
    if (!render || !open) return;
    const el = ref.current;
    if (!el || !mounted.current) return;

    // 초기 상태: 숨김
    el.style.clipPath = "inset(0 0 100% 0)";
    el.style.opacity = "0.3";
    el.style.transition = "none";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!el) return;
        el.style.transition = `clip-path ${duration}ms ease, opacity ${duration}ms ease`;
        el.style.clipPath = "inset(0 0 0 0)";
        el.style.opacity = "1";
        setTimeout(() => {
          if (el) {
            el.style.transition = "";
            el.style.clipPath = "";
            el.style.opacity = "";
          }
        }, duration + 10);
      });
    });
  }, [render, open, duration]);

  if (!render) return null;

  return <div ref={ref}>{children}</div>;
}
