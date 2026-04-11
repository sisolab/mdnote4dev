import { useRef, useState, useEffect, useLayoutEffect } from "react";

interface AnimatedCollapseProps {
  open: boolean;
  children: React.ReactNode;
  duration?: number;
}

export function AnimatedCollapse({ open, children, duration = 200 }: AnimatedCollapseProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(open);
  const prevOpen = useRef(open);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // 첫 렌더링은 애니메이션 없이
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const el = ref.current;
    if (!el) return;

    if (open && !prevOpen.current) {
      // 펼치기
      setVisible(true);
      el.style.overflow = "hidden";
      el.style.opacity = "0";
      el.style.height = "0px";
      requestAnimationFrame(() => {
        const h = el.scrollHeight;
        el.style.transition = `height ${duration}ms ease, opacity ${duration}ms ease`;
        el.style.height = `${h}px`;
        el.style.opacity = "1";
        setTimeout(() => {
          el.style.height = "";
          el.style.overflow = "";
          el.style.transition = "";
          el.style.opacity = "";
        }, duration + 10);
      });
    } else if (!open && prevOpen.current) {
      // 접기
      const h = el.scrollHeight;
      el.style.overflow = "hidden";
      el.style.height = `${h}px`;
      el.style.opacity = "1";
      requestAnimationFrame(() => {
        el.style.transition = `height ${duration}ms ease, opacity ${duration}ms ease`;
        el.style.height = "0px";
        el.style.opacity = "0";
        setTimeout(() => {
          setVisible(false);
          el.style.transition = "";
          el.style.overflow = "";
          el.style.height = "";
          el.style.opacity = "";
        }, duration + 10);
      });
    }

    prevOpen.current = open;
  }, [open, duration]);

  // open이 true인데 visible이 false인 경우 (초기 상태)
  useLayoutEffect(() => {
    if (open && !visible) setVisible(true);
  }, [open]);

  if (!visible && !open) return null;

  return <div ref={ref}>{children}</div>;
}
