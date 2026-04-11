import { useRef, useEffect } from "react";

interface AnimatedCollapseProps {
  open: boolean;
  children: React.ReactNode;
  duration?: number;
}

const DURATION = 400;

export function AnimatedCollapse({ open, children, duration = DURATION }: AnimatedCollapseProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    if (!mounted.current) {
      // 첫 렌더링: 애니메이션 없이 초기 상태 설정
      mounted.current = true;
      if (!open) {
        el.style.height = "0px";
        el.style.overflow = "hidden";
      }
      return;
    }

    if (open) {
      // 펼치기
      el.style.overflow = "hidden";
      const h = el.scrollHeight;
      el.style.height = "0px";
      requestAnimationFrame(() => {
        el.style.transition = `height ${duration}ms ease-out`;
        el.style.height = `${h}px`;
        setTimeout(() => {
          el.style.height = "";
          el.style.overflow = "";
          el.style.transition = "";
        }, duration);
      });
    } else {
      // 접기
      const h = el.scrollHeight;
      el.style.height = `${h}px`;
      el.style.overflow = "hidden";
      requestAnimationFrame(() => {
        el.style.transition = `height ${duration}ms ease-out`;
        el.style.height = "0px";
        setTimeout(() => {
          el.style.transition = "";
        }, duration);
      });
    }
  }, [open, duration]);

  return (
    <div ref={outerRef}>
      {children}
    </div>
  );
}
