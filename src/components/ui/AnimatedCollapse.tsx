import { useRef, useEffect } from "react";

interface AnimatedCollapseProps {
  open: boolean;
  children: React.ReactNode;
  duration?: number;
}

/**
 * 폴더 펼침/접힘 애니메이션 래퍼.
 * children은 항상 DOM에 존재 (unmount 없음).
 * height transition으로 밀려내려오기/올라가기 효과.
 */
export function AnimatedCollapse({ open, children, duration = 400 }: AnimatedCollapseProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 첫 렌더링: 애니메이션 없이 초기 상태
    if (!mounted.current) {
      mounted.current = true;
      if (!open) { el.style.height = "0px"; el.style.overflow = "hidden"; }
      return;
    }

    clearTimeout(timer.current);
    const h = el.scrollHeight;

    if (open) {
      el.style.overflow = "hidden";
      el.style.height = "0px";
    } else {
      el.style.height = `${h}px`;
      el.style.overflow = "hidden";
    }

    requestAnimationFrame(() => {
      el.style.transition = `height ${duration}ms ease-out`;
      el.style.height = open ? `${h}px` : "0px";
      timer.current = setTimeout(() => {
        el.style.transition = "";
        if (open) { el.style.height = ""; el.style.overflow = ""; }
      }, duration);
    });

    return () => clearTimeout(timer.current);
  }, [open, duration]);

  return <div ref={ref}>{children}</div>;
}
