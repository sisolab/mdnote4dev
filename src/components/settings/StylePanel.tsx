import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { SPACING_STYLES, type SpacingStyleName } from "@/stores/settingsStore";

interface TunerItem {
  key: string;
  label: string;
  desc: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const ITEMS: TunerItem[] = [
  { key: "h1Mt", label: "H1 위 여백", desc: "H1 제목 위쪽 margin", min: 0, max: 3, step: 0.25, unit: "rem" },
  { key: "h1Mb", label: "H1 아래 여백", desc: "H1 제목 아래쪽 margin", min: 0, max: 2, step: 0.25, unit: "rem" },
  { key: "h2Mt", label: "H2 위 여백", desc: "H2 제목 위쪽 margin", min: 0, max: 3, step: 0.25, unit: "rem" },
  { key: "h2Mb", label: "H2 아래 여백", desc: "H2 제목 아래쪽 margin", min: 0, max: 2, step: 0.25, unit: "rem" },
  { key: "h3Mt", label: "H3 위 여백", desc: "H3 제목 위쪽 margin", min: 0, max: 3, step: 0.25, unit: "rem" },
  { key: "h3Mb", label: "H3 아래 여백", desc: "H3 제목 아래쪽 margin", min: 0, max: 2, step: 0.25, unit: "rem" },
  { key: "h4Mt", label: "H4 위 여백", desc: "H4 제목 위쪽 margin", min: 0, max: 3, step: 0.25, unit: "rem" },
  { key: "h4Mb", label: "H4 아래 여백", desc: "H4 제목 아래쪽 margin", min: 0, max: 2, step: 0.25, unit: "rem" },
  { key: "p", label: "문단 간격", desc: "p 태그 상하 margin", min: 0, max: 2, step: 0.1, unit: "rem" },
  { key: "li", label: "리스트 항목 간격", desc: "li 태그 상하 margin", min: 0, max: 1, step: 0.05, unit: "rem" },
  { key: "pre", label: "코드블록 간격", desc: "pre 태그 상하 margin", min: 0, max: 2, step: 0.25, unit: "rem" },
  { key: "bq", label: "인용문 간격", desc: "blockquote 상하 margin", min: 0, max: 2, step: 0.25, unit: "rem" },
  { key: "hr", label: "수평선 간격", desc: "hr 상하 margin", min: 0, max: 3, step: 0.25, unit: "rem" },
];

export function StylePanelContent({ spacingStyle, setSpacingStyle }: { spacingStyle: SpacingStyleName; setSpacingStyle: (name: SpacingStyleName) => void }) {
  const currentPreset = SPACING_STYLES[spacingStyle];

  // 커스텀 값 (프리셋 기반으로 초기화)
  const [custom, setCustom] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    ITEMS.forEach((item) => {
      init[item.key] = parseFloat(currentPreset.values[item.key as keyof typeof currentPreset.values]);
    });
    return init;
  });

  const [isCustom, setIsCustom] = useState(false);

  const applyToCSS = (values: Record<string, number>) => {
    const root = document.documentElement;
    root.style.setProperty("--style-h1-mt", `${values.h1Mt}rem`);
    root.style.setProperty("--style-h1-mb", `${values.h1Mb}rem`);
    root.style.setProperty("--style-h2-mt", `${values.h2Mt}rem`);
    root.style.setProperty("--style-h2-mb", `${values.h2Mb}rem`);
    root.style.setProperty("--style-h3-mt", `${values.h3Mt}rem`);
    root.style.setProperty("--style-h3-mb", `${values.h3Mb}rem`);
    root.style.setProperty("--style-h4-mt", `${values.h4Mt}rem`);
    root.style.setProperty("--style-h4-mb", `${values.h4Mb}rem`);
    root.style.setProperty("--style-p", `${values.p}rem`);
    root.style.setProperty("--style-li", `${values.li}rem`);
    root.style.setProperty("--style-pre", `${values.pre}rem`);
    root.style.setProperty("--style-bq", `${values.bq}rem`);
    root.style.setProperty("--style-hr", `${values.hr}rem`);
  };

  const handleChange = (key: string, value: number) => {
    const next = { ...custom, [key]: value };
    setCustom(next);
    setIsCustom(true);
    applyToCSS(next);
  };

  const selectPreset = (name: SpacingStyleName) => {
    setSpacingStyle(name);
    setIsCustom(false);
    const preset = SPACING_STYLES[name];
    const values: Record<string, number> = {};
    ITEMS.forEach((item) => {
      values[item.key] = parseFloat(preset.values[item.key as keyof typeof preset.values]);
    });
    setCustom(values);
    applyToCSS(values);
  };

  const resetItem = (key: string) => {
    const defaultVal = parseFloat(currentPreset.values[key as keyof typeof currentPreset.values]);
    handleChange(key, defaultVal);
  };

  return (
    <>
      {/* 프리셋 선택 */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border-light)" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-tertiary)", marginBottom: "8px" }}>프리셋</div>
        <div style={{ display: "flex", gap: "6px" }}>
          {(Object.entries(SPACING_STYLES) as [SpacingStyleName, typeof SPACING_STYLES.default][]).map(([key, style]) => (
            <button
              key={key}
              onClick={() => selectPreset(key)}
              style={{
                flex: 1, padding: "8px", borderRadius: "6px", cursor: "pointer",
                border: !isCustom && spacingStyle === key ? "2px solid var(--color-accent)" : "1px solid var(--color-border-medium)",
                background: !isCustom && spacingStyle === key ? "var(--color-accent-subtle)" : "var(--color-bg-primary)",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 600, color: !isCustom && spacingStyle === key ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                {style.label}
              </div>
              <div style={{ fontSize: "9px", color: "var(--color-text-tertiary)", marginTop: "2px" }}>
                {style.desc}
              </div>
            </button>
          ))}
          <div
            style={{
              flex: 1, padding: "8px", borderRadius: "6px",
              border: isCustom ? "2px solid #7c3aed" : "1px solid var(--color-border-medium)",
              background: isCustom ? "#7c3aed15" : "var(--color-bg-primary)",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, color: isCustom ? "#7c3aed" : "var(--color-text-primary)" }}>Custom</div>
            <div style={{ fontSize: "9px", color: "var(--color-text-tertiary)", marginTop: "2px" }}>슬라이더로 직접 조절</div>
          </div>
        </div>
      </div>

      {/* 슬라이더 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {ITEMS.map((item) => {
          const defaultVal = parseFloat(currentPreset.values[item.key as keyof typeof currentPreset.values]);
          const isModified = custom[item.key] !== defaultVal;
          return (
            <div key={item.key} style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-primary)" }}>{item.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "11px", color: "var(--color-accent)", fontWeight: 600 }}>
                    {custom[item.key].toFixed(2)}{item.unit}
                  </span>
                  {isModified && (
                    <button onClick={() => resetItem(item.key)} title="기본값으로" style={{
                      width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center",
                      border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)",
                    }}>
                      <RotateCcw size={10} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: "9px", color: "var(--color-text-tertiary)", marginBottom: "4px" }}>{item.desc}</div>
              <input
                type="range"
                min={item.min}
                max={item.max}
                step={item.step}
                value={custom[item.key]}
                onChange={(e) => handleChange(item.key, parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "var(--color-accent)" }}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
