import { useState } from "react";
import { RotateCcw } from "lucide-react";

interface TunerItem {
  key: string;
  label: string;
  desc: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  defaultValue: number;
}

const ITEMS: TunerItem[] = [
  { key: "--h1-mt", label: "H1 위 여백", desc: "H1 제목 위쪽 margin", min: 0, max: 3, step: 0.25, unit: "rem", defaultValue: 1.5 },
  { key: "--h1-mb", label: "H1 아래 여백", desc: "H1 제목 아래쪽 margin", min: 0, max: 2, step: 0.25, unit: "rem", defaultValue: 0.75 },
  { key: "--h2-mt", label: "H2 위 여백", desc: "H2 제목 위쪽 margin", min: 0, max: 3, step: 0.25, unit: "rem", defaultValue: 1.25 },
  { key: "--h2-mb", label: "H2 아래 여백", desc: "H2 제목 아래쪽 margin", min: 0, max: 2, step: 0.25, unit: "rem", defaultValue: 0.5 },
  { key: "--h3-mt", label: "H3 위 여백", desc: "H3 제목 위쪽 margin", min: 0, max: 3, step: 0.25, unit: "rem", defaultValue: 1.0 },
  { key: "--h3-mb", label: "H3 아래 여백", desc: "H3 제목 아래쪽 margin", min: 0, max: 2, step: 0.25, unit: "rem", defaultValue: 0.5 },
  { key: "--h4-mt", label: "H4 위 여백", desc: "H4 제목 위쪽 margin", min: 0, max: 3, step: 0.25, unit: "rem", defaultValue: 0.75 },
  { key: "--h4-mb", label: "H4 아래 여백", desc: "H4 제목 아래쪽 margin", min: 0, max: 2, step: 0.25, unit: "rem", defaultValue: 0.5 },
  { key: "--p-spacing", label: "문단 간격", desc: "p 태그 상하 margin", min: 0, max: 2, step: 0.1, unit: "rem", defaultValue: 0.5 },
  { key: "--li-spacing", label: "리스트 항목 간격", desc: "li 태그 상하 margin", min: 0, max: 1, step: 0.05, unit: "rem", defaultValue: 0.2 },
  { key: "--pre-spacing", label: "코드블록 간격", desc: "pre 태그 상하 margin", min: 0, max: 2, step: 0.25, unit: "rem", defaultValue: 0.75 },
  { key: "--bq-spacing", label: "인용문 간격", desc: "blockquote 상하 margin", min: 0, max: 2, step: 0.25, unit: "rem", defaultValue: 0.75 },
  { key: "--hr-spacing", label: "수평선 간격", desc: "hr 상하 margin", min: 0, max: 3, step: 0.25, unit: "rem", defaultValue: 1.5 },
];

export function StyleTuner({ onClose }: { onClose: () => void }) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    ITEMS.forEach((item) => { init[item.key] = item.defaultValue; });
    return init;
  });

  const applyToCSS = (key: string, value: number) => {
    const root = document.documentElement;
    const item = ITEMS.find((i) => i.key === key)!;
    // CSS에 직접 적용
    switch (key) {
      case "--h1-mt": root.style.setProperty("--tuner-h1-mt", `${value}${item.unit}`); break;
      case "--h1-mb": root.style.setProperty("--tuner-h1-mb", `${value}${item.unit}`); break;
      case "--h2-mt": root.style.setProperty("--tuner-h2-mt", `${value}${item.unit}`); break;
      case "--h2-mb": root.style.setProperty("--tuner-h2-mb", `${value}${item.unit}`); break;
      case "--h3-mt": root.style.setProperty("--tuner-h3-mt", `${value}${item.unit}`); break;
      case "--h3-mb": root.style.setProperty("--tuner-h3-mb", `${value}${item.unit}`); break;
      case "--h4-mt": root.style.setProperty("--tuner-h4-mt", `${value}${item.unit}`); break;
      case "--h4-mb": root.style.setProperty("--tuner-h4-mb", `${value}${item.unit}`); break;
      case "--p-spacing": root.style.setProperty("--tuner-p-spacing", `${value}${item.unit}`); break;
      case "--li-spacing": root.style.setProperty("--tuner-li-spacing", `${value}${item.unit}`); break;
      case "--pre-spacing": root.style.setProperty("--tuner-pre-spacing", `${value}${item.unit}`); break;
      case "--bq-spacing": root.style.setProperty("--tuner-bq-spacing", `${value}${item.unit}`); break;
      case "--hr-spacing": root.style.setProperty("--tuner-hr-spacing", `${value}${item.unit}`); break;
    }
  };

  const handleChange = (key: string, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    applyToCSS(key, value);
  };

  const resetItem = (key: string) => {
    const item = ITEMS.find((i) => i.key === key)!;
    handleChange(key, item.defaultValue);
  };

  const resetAll = () => {
    ITEMS.forEach((item) => {
      handleChange(item.key, item.defaultValue);
    });
  };

  // CSS 출력 (복사용)
  const exportCSS = () => {
    const lines = ITEMS.map((item) => {
      const v = values[item.key];
      switch (item.key) {
        case "--h1-mt": case "--h1-mb": return `.tiptap h1 { margin: ${values["--h1-mt"]}rem 0 ${values["--h1-mb"]}rem; }`;
        case "--h2-mt": case "--h2-mb": return `.tiptap h2 { margin: ${values["--h2-mt"]}rem 0 ${values["--h2-mb"]}rem; }`;
        case "--h3-mt": case "--h3-mb": return `.tiptap h3 { margin: ${values["--h3-mt"]}rem 0 ${values["--h3-mb"]}rem; }`;
        case "--h4-mt": case "--h4-mb": return `.tiptap h4 { margin: ${values["--h4-mt"]}rem 0 ${values["--h4-mb"]}rem; }`;
        case "--p-spacing": return `.tiptap p { margin: ${v}rem 0; }`;
        case "--li-spacing": return `.tiptap li { margin: ${v}rem 0; }`;
        case "--pre-spacing": return `.tiptap pre { margin: ${v}rem 0; }`;
        case "--bq-spacing": return `.tiptap blockquote { margin: ${v}rem 0; }`;
        case "--hr-spacing": return `.tiptap hr { margin: ${v}rem auto; }`;
        default: return "";
      }
    }).filter((l, i, a) => l && a.indexOf(l) === i);
    return lines.join("\n");
  };

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: "320px", zIndex: 9999,
      background: "var(--color-bg-elevated)", borderLeft: "1px solid var(--color-border-medium)",
      boxShadow: "-4px 0 16px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* 헤더 */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid var(--color-border-light)",
      }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-heading)" }}>스타일 튜너 (임시)</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={resetAll} style={{
            fontSize: "11px", padding: "4px 8px", borderRadius: "4px",
            border: "1px solid var(--color-border-medium)", background: "transparent",
            color: "var(--color-text-secondary)", cursor: "pointer",
          }}>전체 리셋</button>
          <button onClick={() => { navigator.clipboard.writeText(exportCSS()); }} style={{
            fontSize: "11px", padding: "4px 8px", borderRadius: "4px",
            border: "1px solid var(--color-border-medium)", background: "transparent",
            color: "var(--color-text-secondary)", cursor: "pointer",
          }}>CSS 복사</button>
          <button onClick={onClose} style={{
            fontSize: "14px", width: "24px", height: "24px",
            border: "none", background: "transparent", cursor: "pointer",
            color: "var(--color-text-tertiary)",
          }}>×</button>
        </div>
      </div>

      {/* 항목 리스트 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
        {ITEMS.map((item) => (
          <div key={item.key} style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)" }}>{item.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--color-accent)", fontWeight: 600, minWidth: "45px", textAlign: "right" }}>
                  {values[item.key]}{item.unit}
                </span>
                {values[item.key] !== item.defaultValue && (
                  <button onClick={() => resetItem(item.key)} title="기본값으로 리셋" style={{
                    width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center",
                    border: "none", background: "transparent", cursor: "pointer",
                    color: "var(--color-text-tertiary)",
                  }}>
                    <RotateCcw size={11} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", marginBottom: "6px" }}>{item.desc}</div>
            <input
              type="range"
              min={item.min}
              max={item.max}
              step={item.step}
              value={values[item.key]}
              onChange={(e) => handleChange(item.key, parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "var(--color-accent)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
