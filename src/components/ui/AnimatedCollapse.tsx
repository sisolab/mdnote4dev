import { useRef, useState, useEffect } from "react";

interface AnimatedCollapseProps {
  open: boolean;
  children: React.ReactNode;
  duration?: number;
}

export function AnimatedCollapse({ open, children, duration = 200 }: AnimatedCollapseProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(open);
  const [animStyle, setAnimStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const el = contentRef.current;

    if (open) {
      // 펼치기
      setShouldRender(true);
      setAnimStyle({ height: "0px", opacity: 0, overflow: "hidden" });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!contentRef.current) return;
          const h = contentRef.current.scrollHeight;
          setAnimStyle({
            height: `${h}px`,
            opacity: 1,
            overflow: "hidden",
            transition: `height ${duration}ms ease, opacity ${duration}ms ease`,
          });
          setTimeout(() => {
            setAnimStyle({}); // 애니메이션 완료 후 스타일 제거 (자연스러운 높이)
          }, duration);
        });
      });
    } else if (el) {
      // 접기
      const h = el.scrollHeight;
      setAnimStyle({ height: `${h}px`, opacity: 1, overflow: "hidden" });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimStyle({
            height: "0px",
            opacity: 0,
            overflow: "hidden",
            transition: `height ${duration}ms ease, opacity ${duration}ms ease`,
          });
          setTimeout(() => {
            setShouldRender(false);
            setAnimStyle({});
          }, duration);
        });
      });
    }
  }, [open, duration]);

  if (!shouldRender) return null;

  return (
    <div ref={contentRef} style={animStyle}>
      {children}
    </div>
  );
}
