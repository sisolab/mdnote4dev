import { useEffect, useState } from "react";
import {
  useSettingsStore,
  PRESETS,
  FONT_OPTIONS,
  ACCENT_OPTIONS,
  DEFAULT_SETTINGS,
  SAVE_MODE_OPTIONS,
  SPACING_STYLES,
  DESIGN_OPTIONS,
  DEFAULT_DESIGN,
  getFontFamily,
  getCodeFontFamily,
  type EditorSettings,
  type SaveMode,
  type SpacingStyleName,
  type DesignPresets,
} from "@/stores/settingsStore";
import { Sun, Moon, BookOpen, CloudMoon, Minimize2, AlignCenter, Maximize2, SlidersHorizontal, RotateCcw, Type, X, FileText } from "lucide-react";
import { CATEGORIES, CODE_FONT_GOOGLE_FAMILIES, buildFontUrl, type FontItem } from "./FontPreview";
import { useAppStore } from "@/stores/appStore";

function ResetButton({ onClick, visible }: { onClick: () => void; visible: boolean }) {
  if (!visible) return null;
  return (
    <button
      onClick={onClick}
      title="초기화"
      style={{
        width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer",
        color: "var(--color-text-muted)", transition: "all 0.1s", flexShrink: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; e.currentTarget.style.background = "var(--color-bg-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; e.currentTarget.style.background = "transparent"; }}
    >
      <RotateCcw size={11} />
    </button>
  );
}

/* ── 공통 컴포넌트 ── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
      {children}
    </h3>
  );
}



function CompactSlider({
  label, value, min, max, step, unit, decimals, onChange, defaultValue,
}: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; decimals?: number; onChange: (v: number) => void; defaultValue: number;
}) {
  const isModified = Math.abs(value - defaultValue) > 0.001;
  const totalSteps = Math.round((max - min) / step);
  const tickStep = totalSteps <= 20 ? step : step * Math.ceil(totalSteps / 20);
  const ticks: number[] = [];
  for (let v = min; v <= max + tickStep * 0.01; v += tickStep) ticks.push(v);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", minHeight: "36px", padding: "2px 0" }}>
      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)", width: "86px", flexShrink: 0 }}>{label}</span>
      <div
        style={{ flex: 1, position: "relative", height: "24px", cursor: "pointer" }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const raw = min + ratio * (max - min);
          const snapped = Math.round(raw / step) * step;
          onChange(Math.max(min, Math.min(max, parseFloat(snapped.toFixed(10)))));
        }}
      >
        {/* 트랙 배경 */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", height: "3px", borderRadius: "2px", background: "var(--color-border-light)" }} />
        {/* 활성 트랙 */}
        <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: `${pct}%`, height: "3px", borderRadius: "2px", background: "var(--color-accent)", transition: "width 0.05s" }} />
        {/* tick dots */}
        {ticks.map((t, i) => {
          const tp = ((t - min) / (max - min)) * 100;
          return (
            <div key={i} style={{
              position: "absolute", left: `${tp}%`, top: "50%", transform: "translate(-50%, -50%)",
              width: "5px", height: "5px", borderRadius: "50%",
              background: t <= value ? "var(--color-accent)" : "var(--color-border-medium)",
              transition: "background 0.1s",
            }} />
          );
        })}
        {/* thumb */}
        <div style={{
          position: "absolute", left: `${pct}%`, top: "50%", transform: "translate(-50%, -50%)",
          width: "13px", height: "13px", borderRadius: "50%",
          background: "var(--color-accent)", border: "2px solid var(--color-bg-elevated)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.05s",
          zIndex: 2,
        }} />
        {/* 투명 네이티브 range (드래그용) */}
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 3 }}
        />
      </div>
      <span style={{ fontSize: "12px", color: "var(--color-accent)", fontWeight: 600, width: "48px", textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
        {decimals ? value.toFixed(decimals) : value}{unit}
      </span>
      {isModified ? (
        <button onClick={() => onChange(defaultValue)} title="기본값으로" style={{
          width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)", flexShrink: 0,
        }}>
          <RotateCcw size={10} />
        </button>
      ) : <div style={{ width: "16px", flexShrink: 0 }} />}
    </div>
  );
}

function ToggleButtons({ options, value, onChange }: {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "inline-flex", borderRadius: "6px", border: "1px solid var(--color-border-input)", overflow: "hidden", whiteSpace: "nowrap" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
            padding: "7px 10px", fontSize: "12px", fontWeight: value === opt.value ? 600 : 500, flexShrink: 0,
            border: "none", cursor: "pointer", position: "relative",
            fontFamily: "inherit", flex: 1,
            background: "var(--color-bg-primary)",
            color: value === opt.value ? "var(--color-accent)" : "var(--color-text-primary)",
            transition: "all 0.15s",
          }}
        >
          {opt.icon}{opt.label}
          <div style={{
            position: "absolute", bottom: "0", left: "50%", transform: "translateX(-50%)",
            width: value === opt.value ? "60%" : "0%", height: "2px", borderRadius: "1px",
            background: "var(--color-accent)", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }} />
        </button>
      ))}
    </div>
  );
}


function SpacingSliders({ spacingStyle, setSpacingStyle }: { spacingStyle: SpacingStyleName; setSpacingStyle: (name: SpacingStyleName) => void }) {
  const ITEMS = [
    { key: "h1Mt", label: "H1 위", min: 0.25, max: 2, step: 0.25, unit: "rem" },
    { key: "h1Mb", label: "H1 아래", min: 0, max: 1, step: 0.25, unit: "rem" },
    { key: "h2Mt", label: "H2 위", min: 0.25, max: 1.75, step: 0.25, unit: "rem" },
    { key: "h2Mb", label: "H2 아래", min: 0, max: 1, step: 0.25, unit: "rem" },
    { key: "h3Mt", label: "H3 위", min: 0.25, max: 1.5, step: 0.25, unit: "rem" },
    { key: "h3Mb", label: "H3 아래", min: 0, max: 0.75, step: 0.25, unit: "rem" },
    { key: "h4Mt", label: "H4 위", min: 0.25, max: 1.25, step: 0.25, unit: "rem" },
    { key: "h4Mb", label: "H4 아래", min: 0, max: 0.75, step: 0.25, unit: "rem" },
    { key: "p", label: "문단", min: 0, max: 0.8, step: 0.1, unit: "rem" },
    { key: "li", label: "리스트", min: 0, max: 0.4, step: 0.05, unit: "rem" },
    { key: "pre", label: "코드블록", min: 0.25, max: 1, step: 0.25, unit: "rem" },
    { key: "bq", label: "인용문", min: 0.25, max: 1, step: 0.25, unit: "rem" },
    { key: "hr", label: "수평선", min: 0.5, max: 2, step: 0.25, unit: "rem" },
  ];

  const preset = SPACING_STYLES[spacingStyle];
  const [custom, setCustom] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    ITEMS.forEach((item) => { init[item.key] = parseFloat(preset.values[item.key as keyof typeof preset.values]); });
    return init;
  });
  const [isCustom, setIsCustom] = useState(false);

  const applyToCSS = (values: Record<string, number>) => {
    const root = document.documentElement;
    const map: Record<string, string> = {
      h1Mt: "--style-h1-mt", h1Mb: "--style-h1-mb", h2Mt: "--style-h2-mt", h2Mb: "--style-h2-mb",
      h3Mt: "--style-h3-mt", h3Mb: "--style-h3-mb", h4Mt: "--style-h4-mt", h4Mb: "--style-h4-mb",
      p: "--style-p", li: "--style-li", pre: "--style-pre", bq: "--style-bq", hr: "--style-hr",
    };
    Object.entries(values).forEach(([k, v]) => { if (map[k]) root.style.setProperty(map[k], `${v}rem`); });
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
    const p = SPACING_STYLES[name];
    const values: Record<string, number> = {};
    ITEMS.forEach((item) => { values[item.key] = parseFloat(p.values[item.key as keyof typeof p.values]); });
    setCustom(values);
    applyToCSS(values);
  };

  return (
    <>
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        {(Object.entries(SPACING_STYLES) as [SpacingStyleName, typeof SPACING_STYLES.default][]).map(([key, style]) => {
          const active = !isCustom && spacingStyle === key;
          const color = "#8b5cf6";
          return (
            <button
              key={key}
              onClick={() => selectPreset(key)}
              style={{
                padding: "5px 12px", fontSize: "11px", fontWeight: active ? 600 : 400,
                borderRadius: "5px", cursor: "pointer",
                border: active ? `1.5px solid ${color}` : "1px solid var(--color-border-medium)",
                background: active ? `${color}18` : "var(--color-bg-primary)",
                color: active ? color : "var(--color-text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {style.label}
            </button>
          );
        })}
        <span style={{
          padding: "5px 12px", fontSize: "11px", fontWeight: isCustom ? 600 : 400,
          borderRadius: "5px",
          border: isCustom ? "1.5px solid #888" : "1px solid var(--color-border-medium)",
          background: isCustom ? "var(--color-bg-hover)" : "var(--color-bg-primary)",
          color: isCustom ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
        }}>
          커스텀
        </span>
      </div>
      {ITEMS.map((item) => {
        const defaultVal = parseFloat(preset.values[item.key as keyof typeof preset.values]);
        return (
          <CompactSlider key={item.key} label={item.label} value={custom[item.key]} min={item.min} max={item.max}
            step={item.step} unit={item.unit} decimals={2} defaultValue={defaultVal}
            onChange={(v) => handleChange(item.key, v)} />
        );
      })}
    </>
  );
}

function SectionPresetButtons({ keys, settings, color, onApply }: {
  keys: (keyof EditorSettings)[]; settings: EditorSettings; color: string;
  onApply: (partial: Partial<EditorSettings>) => void;
}) {
  const matchesPreset = (preset: EditorSettings) =>
    keys.every((k) => Math.abs(Number(settings[k]) - Number(preset[k])) < 0.01);
  const isCustom = !PRESETS.some((p) => matchesPreset(p.settings));

  return (
    <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
      {PRESETS.map((preset) => {
        const active = matchesPreset(preset.settings);
        return (
          <button key={preset.name}
            onClick={() => { const p: any = {}; keys.forEach((k) => { p[k] = preset.settings[k]; }); onApply(p); }}
            style={{
              padding: "5px 12px", fontSize: "11px", fontWeight: active ? 600 : 400,
              borderRadius: "5px", cursor: "pointer",
              border: active ? `1.5px solid ${color}` : "1px solid var(--color-border-medium)",
              background: active ? `${color}18` : "var(--color-bg-primary)",
              color: active ? color : "var(--color-text-secondary)",
              transition: "all 0.15s",
            }}
          >
            {preset.name}
          </button>
        );
      })}
      <span style={{
        padding: "5px 12px", fontSize: "11px", fontWeight: isCustom ? 600 : 400,
        borderRadius: "5px",
        border: isCustom ? "1.5px solid #888" : "1px solid var(--color-border-medium)",
        background: isCustom ? "var(--color-bg-hover)" : "var(--color-bg-primary)",
        color: isCustom ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
      }}>
        커스텀
      </span>
    </div>
  );
}

function DocStyleTab({ settings, updateSetting, applyPreset, spacingStyle, setSpacingStyle }: {
  settings: EditorSettings; updateSetting: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
  applyPreset: (preset: EditorSettings) => void; spacingStyle: SpacingStyleName; setSpacingStyle: (name: SpacingStyleName) => void;
}) {
  const { savedPresets, addSavedPreset, removeSavedPreset } = useSettingsStore();
  const [newPresetName, setNewPresetName] = useState("");

  const isPresetMatch = (preset: EditorSettings) => {
    const keys: (keyof EditorSettings)[] = Object.keys(DEFAULT_SETTINGS) as any;
    return keys.every((k) => k === "fontFamily" || Math.abs(Number(settings[k]) - Number(preset[k])) < 0.01);
  };

  const applySectionPreset = (partial: Partial<EditorSettings>) => {
    Object.entries(partial).forEach(([k, v]) => updateSetting(k as keyof EditorSettings, v as any));
  };

  const typoKeys: (keyof EditorSettings)[] = ["fontSize", "lineHeight", "letterSpacing", "headingScale"];
  const layoutKeys: (keyof EditorSettings)[] = ["editorMaxWidth", "editorPaddingX", "editorPaddingY"];
  const codeKeys: (keyof EditorSettings)[] = ["codeFontSize", "codeLineHeight", "codePadding"];

  const presetIcons: Record<string, React.ReactNode> = {
    "컴팩트": <Minimize2 size={12} />,
    "기본": <AlignCenter size={12} />,
    "여유로운": <Maximize2 size={12} />,
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
      <PreviewDocButton />
      {/* 프리셋 */}
      <SectionTitle>프리셋</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
        {savedPresets.map((p) => {
          const active = isPresetMatch(p.settings);
          return (
            <div key={p.name} style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <button
                onClick={() => applyPreset(p.settings)}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "5px 24px 5px 12px", fontSize: "12px", fontWeight: active ? 600 : 400,
                  borderRadius: "6px", cursor: "pointer",
                  border: active ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border-input)",
                  background: active ? "var(--color-accent-subtle)" : "var(--color-bg-primary)",
                  color: active ? "var(--color-accent)" : "var(--color-text-primary)",
                  transition: "all 0.15s",
                }}
              >
                {presetIcons[p.name] || <SlidersHorizontal size={12} />}
                {p.name}
              </button>
              <button
                onClick={() => removeSavedPreset(p.name)}
                style={{
                  position: "absolute", right: "5px", top: "50%", transform: "translateY(-50%)",
                  width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center",
                  border: "none", background: "transparent", cursor: "pointer",
                  color: "var(--color-text-muted)", borderRadius: "3px",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; e.currentTarget.style.background = "var(--color-bg-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; e.currentTarget.style.background = "transparent"; }}
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
      </div>
      {/* 프리셋 저장 */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
        <input
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newPresetName.trim()) {
              addSavedPreset({ name: newPresetName.trim(), settings: { ...settings } });
              setNewPresetName("");
            }
          }}
          placeholder="현재 설정을 프리셋으로 저장..."
          style={{
            flex: 1, fontSize: "12px", padding: "5px 10px",
            borderRadius: "6px", border: "1px solid var(--color-border-input)",
            background: "var(--color-bg-primary)", color: "var(--color-text-primary)",
            outline: "none",
          }}
        />
        <button
          onClick={() => {
            if (!newPresetName.trim()) return;
            addSavedPreset({ name: newPresetName.trim(), settings: { ...settings } });
            setNewPresetName("");
          }}
          disabled={!newPresetName.trim()}
          style={{
            padding: "5px 14px", fontSize: "12px", fontWeight: 600,
            borderRadius: "6px", border: "none", cursor: newPresetName.trim() ? "pointer" : "default",
            background: newPresetName.trim() ? "var(--color-accent)" : "var(--color-bg-hover)",
            color: newPresetName.trim() ? "#fff" : "var(--color-text-tertiary)",
            transition: "all 0.15s",
          }}
        >
          저장
        </button>
      </div>

      <div style={{ height: "1px", background: "var(--color-border-light)", margin: "16px 0" }} />

      {/* 타이포그래피 */}
      <SectionTitle>타이포그래피</SectionTitle>
      <SectionPresetButtons keys={typoKeys} settings={settings} color="#d4845a" onApply={applySectionPreset} />
      <CompactSlider label="글자 크기" value={settings.fontSize} min={13} max={18} step={1} unit="px" defaultValue={DEFAULT_SETTINGS.fontSize} onChange={(v) => updateSetting("fontSize", v)} />
      <CompactSlider label="행 높이" value={settings.lineHeight} min={1.4} max={2.0} step={0.1} unit="" decimals={1} defaultValue={DEFAULT_SETTINGS.lineHeight} onChange={(v) => updateSetting("lineHeight", v)} />
      <CompactSlider label="자간" value={settings.letterSpacing} min={-0.2} max={0.4} step={0.1} unit="px" decimals={1} defaultValue={DEFAULT_SETTINGS.letterSpacing} onChange={(v) => updateSetting("letterSpacing", v)} />
      <CompactSlider label="제목 배율" value={settings.headingScale} min={1.1} max={1.5} step={0.1} unit="×" decimals={1} defaultValue={DEFAULT_SETTINGS.headingScale} onChange={(v) => updateSetting("headingScale", v)} />

      <div style={{ height: "1px", background: "var(--color-border-light)", margin: "16px 0" }} />

      {/* 레이아웃 */}
      <SectionTitle>레이아웃</SectionTitle>
      <SectionPresetButtons keys={layoutKeys} settings={settings} color="#1a73e8" onApply={applySectionPreset} />
      <CompactSlider label="에디터 최대폭" value={settings.editorMaxWidth} min={480} max={1040} step={80} unit="px" defaultValue={DEFAULT_SETTINGS.editorMaxWidth} onChange={(v) => updateSetting("editorMaxWidth", v)} />
      <CompactSlider label="좌우 패딩" value={settings.editorPaddingX} min={32} max={64} step={4} unit="px" defaultValue={DEFAULT_SETTINGS.editorPaddingX} onChange={(v) => updateSetting("editorPaddingX", v)} />
      <CompactSlider label="상하 패딩" value={settings.editorPaddingY} min={32} max={64} step={4} unit="px" defaultValue={DEFAULT_SETTINGS.editorPaddingY} onChange={(v) => updateSetting("editorPaddingY", v)} />

      <div style={{ height: "1px", background: "var(--color-border-light)", margin: "16px 0" }} />

      {/* 코드 블록 */}
      <SectionTitle>코드 블록</SectionTitle>
      <SectionPresetButtons keys={codeKeys} settings={settings} color="#0d9488" onApply={applySectionPreset} />
      <CompactSlider label="글자 크기" value={settings.codeFontSize} min={12} max={15} step={1} unit="px" defaultValue={DEFAULT_SETTINGS.codeFontSize} onChange={(v) => updateSetting("codeFontSize", v)} />
      <CompactSlider label="줄 간격" value={settings.codeLineHeight} min={1.3} max={1.8} step={0.1} unit="" decimals={1} defaultValue={DEFAULT_SETTINGS.codeLineHeight} onChange={(v) => updateSetting("codeLineHeight", v)} />
      <CompactSlider label="패딩" value={settings.codePadding} min={8} max={20} step={2} unit="px" defaultValue={DEFAULT_SETTINGS.codePadding} onChange={(v) => updateSetting("codePadding", v)} />

      <div style={{ height: "1px", background: "var(--color-border-light)", margin: "16px 0" }} />

      {/* 줄 간격 */}
      <SectionTitle>줄 간격</SectionTitle>
      <SpacingSliders spacingStyle={spacingStyle} setSpacingStyle={setSpacingStyle} />
    </div>
  );
}

function SaveModeSetting() {
  const { saveMode, setSaveMode } = useSettingsStore();
  const [pending, setPending] = useState<SaveMode>(saveMode);
  const changed = pending !== saveMode;

  return (
    <>
      <div style={{ marginBottom: "4px" }}>
        <div style={{ display: "inline-flex", borderRadius: "6px", border: "1px solid var(--color-border-input)", overflow: "hidden" }}>
          {SAVE_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPending(opt.value)}
              style={{
                padding: "7px 10px", fontSize: "12px", fontWeight: pending === opt.value ? 600 : 400,
                border: "none", cursor: "pointer", position: "relative",
                fontFamily: "inherit",
                background: "var(--color-bg-primary)",
                color: pending === opt.value ? "var(--color-accent)" : "var(--color-text-primary)",
                transition: "all 0.15s",
              }}
            >
              {opt.label}
              <div style={{
                position: "absolute", bottom: "0", left: "50%", transform: "translateX(-50%)",
                width: pending === opt.value ? "60%" : "0%", height: "2px", borderRadius: "1px",
                background: "var(--color-accent)", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }} />
            </button>
          ))}
        </div>
      </div>
      {changed && (
        <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
          <button
            onClick={() => setPending(saveMode)}
            style={{
              padding: "4px 12px", fontSize: "12px", fontWeight: 500,
              background: "var(--color-bg-hover)", color: "var(--color-text-primary)",
              border: "none", borderRadius: "6px", cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            onClick={() => setSaveMode(pending)}
            style={{
              padding: "4px 12px", fontSize: "12px", fontWeight: 600,
              background: "var(--color-accent)", color: "#fff",
              border: "none", borderRadius: "6px", cursor: "pointer",
            }}
          >
            적용
          </button>
        </div>
      )}
      <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", marginTop: "4px", marginBottom: "4px" }}>
        {SAVE_MODE_OPTIONS.find((o) => o.value === pending)?.desc}
      </div>
    </>
  );
}

const DESIGN_SECTIONS: { key: keyof DesignPresets; label: string; preview: (style: string) => React.ReactNode }[] = [
  {
    key: "h1", label: "제목 1 (H1)",
    preview: (style) => {
      const base: React.CSSProperties = { fontSize: "22px", fontWeight: 700, color: "var(--color-text-heading)", margin: 0, lineHeight: 1.3 };
      const variants: Record<string, React.CSSProperties> = {
        underline: { paddingBottom: "4px", borderBottom: "2px solid var(--color-border-medium)" },
        "accent-left": { borderLeft: "4px solid var(--color-accent)", paddingLeft: "8px" },
        "gradient-line": { paddingBottom: "5px", borderBottom: "3px solid transparent", borderImage: "linear-gradient(90deg, var(--color-accent), transparent) 1" },
        "thin-large": { borderLeft: "4px solid var(--color-accent)", paddingLeft: "8px", background: "linear-gradient(90deg, var(--color-accent-subtle), transparent 70%)", borderRadius: "0 4px 4px 0" },
      };
      return <div style={{ ...base, ...variants[style] }}>Research Notes</div>;
    },
  },
  {
    key: "h2", label: "제목 2 (H2)",
    preview: (style) => {
      const base: React.CSSProperties = { fontSize: "18px", fontWeight: 600, color: "var(--color-text-heading)", margin: 0, lineHeight: 1.35 };
      const variants: Record<string, React.CSSProperties> = {
        underline: { paddingBottom: "4px", borderBottom: "2px solid var(--color-border-medium)" },
        "accent-left": { borderLeft: "3px solid var(--color-accent)", paddingLeft: "6px" },
        highlight: { borderBottom: "3px solid var(--color-accent-subtle)", paddingBottom: "2px", display: "inline-block" },
        uppercase: { background: "var(--color-bg-secondary)", padding: "3px 6px", borderRadius: "4px" },
      };
      return <div style={{ ...base, ...variants[style] }}>프로젝트 개요</div>;
    },
  },
  {
    key: "h3", label: "제목 3 (H3)",
    preview: (style) => {
      const base: React.CSSProperties = { fontSize: "15px", fontWeight: 600, color: "var(--color-text-heading)", margin: 0, lineHeight: 1.4 };
      const variants: Record<string, React.CSSProperties> = {
        "accent-left": { borderLeft: "3px solid var(--color-accent)", paddingLeft: "6px" },
        muted: { color: "var(--color-text-secondary)", fontStyle: "italic" },
        badge: {},
        dotted: { paddingBottom: "2px", borderBottom: "2px dotted var(--color-border-medium)", display: "inline-block" },
      };
      return <div style={{ ...base, ...variants[style] }}>{style === "badge" && <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "2px", background: "var(--color-accent)", marginRight: "6px", verticalAlign: "middle" }} />}핵심 기능</div>;
    },
  },
  {
    key: "blockquote", label: "인용문",
    preview: (style) => {
      const text = "Good design is as little design as possible.";
      if (style === "background") return <div style={{ borderLeft: "3px solid var(--color-accent)", background: "var(--color-bg-hover)", padding: "8px 12px", borderRadius: "0 6px 6px 0", color: "var(--color-text-secondary)", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>{text}</div>;
      if (style === "quote-mark") return <div style={{ paddingLeft: "28px", position: "relative", color: "var(--color-text-secondary)", fontSize: "13px", margin: 0, lineHeight: 1.6 }}><span style={{ position: "absolute", left: "2px", top: "-4px", fontSize: "28px", color: "var(--color-accent)", opacity: 0.4, lineHeight: 1 }}>{"\u201C"}</span>{text}</div>;
      if (style === "serif") return <div style={{ fontStyle: "italic", fontSize: "13.5px", paddingLeft: "16px", opacity: 0.85, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>{text}</div>;
      return <div style={{ borderLeft: "3px solid var(--color-accent)", paddingLeft: "12px", color: "var(--color-text-secondary)", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>{text}</div>;
    },
  },
  {
    key: "codeBlock", label: "코드 블록",
    preview: (style) => {
      const code = 'def hello():\n    print("Hello!")';
      const variants: Record<string, React.CSSProperties> = {
        default: { background: "#1e1e2e", color: "#cdd6f4" },
        light: { background: "var(--color-bg-secondary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-light)" },
        bordered: { background: "transparent", color: "var(--color-text-primary)", border: "1px solid var(--color-border-medium)", borderRadius: "6px" },
        terminal: { background: "#0c0c0c", color: "#33ff33" },
        header: { background: "var(--color-bg-secondary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-light)", borderRadius: "8px", paddingTop: "32px", position: "relative" },
      };
      return (
        <div style={{ position: "relative" }}>
          {style === "header" && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "24px", background: "var(--color-bg-hover)", borderRadius: "7px 7px 0 0", borderBottom: "1px solid var(--color-border-light)" }} />}
          <pre style={{ ...variants[style] || variants.default, padding: "8px 10px", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace", margin: 0, lineHeight: 1.5, whiteSpace: "pre" }}>{code}</pre>
        </div>
      );
    },
  },
  {
    key: "hr", label: "수평선",
    preview: (style) => {
      if (style === "dotted") return <hr style={{ border: "none", borderTop: "2px dotted var(--color-border-medium)", margin: "8px auto", width: "100%" }} />;
      if (style === "thick") return <hr style={{ border: "none", borderTop: "4px solid var(--color-border-medium)", margin: "8px auto", width: "60%" }} />;
      if (style === "dots") return <div style={{ textAlign: "center", fontSize: "18px", letterSpacing: "6px", color: "var(--color-text-light)", margin: "4px 0" }}>···</div>;
      if (style === "fade") return <hr style={{ border: "none", height: "1px", background: "linear-gradient(90deg, transparent 5%, var(--color-border-medium) 50%, transparent 95%)", margin: "8px 0" }} />;
      return <hr style={{ border: "none", borderTop: "3px solid var(--color-border-medium)", margin: "8px auto", width: "98%" }} />;
    },
  },
];

const DESIGN_PREVIEW_MD = `# Typography & Layout Preview

This document demonstrates how each design preset affects your notes. Open the **Settings > Design** tab and try different styles while viewing this page.

## Getting Started

Marknote is a local-first markdown editor built for researchers and developers. Your documents are **standard markdown files** stored on your own filesystem — no cloud required.

### Key Features

- WYSIWYG editing with live preview
- File attachments and image paste
- Tag-based organization
- Multiple themes and accent colors

### How It Works

Every note is a plain \`.md\` file. Metadata like tags are stored in the frontmatter:

\`\`\`yaml
---
tags: [research, notes, chemistry]
---
\`\`\`

#### A Note on Portability

Your files work in any markdown editor — Typora, VS Code, Obsidian, or even a plain text editor.

---

## Code Examples

Inline code looks like \`npm install\` or \`Ctrl+S\` within a sentence.

\`\`\`python
from pathlib import Path

def scan_notes(directory: str) -> list[dict]:
    notes = []
    for md_file in Path(directory).rglob("*.md"):
        content = md_file.read_text(encoding="utf-8")
        notes.append({"name": md_file.stem, "path": str(md_file)})
    return sorted(notes, key=lambda n: n["name"])
\`\`\`

---

## Quotes & References

> Good design is as little design as possible. Less, but better — because it concentrates on the essential aspects.
> — Dieter Rams

> The best way to predict the future is to invent it. — Alan Kay

---

## Tables

| Shortcut | Action | Context |
|----------|--------|---------|
| Ctrl+S | Save | Editor |
| Ctrl+W | Close tab | Global |
| Ctrl+1~4 | Heading | Editor |

---

- Bullet item one
- Bullet item two
  - Nested item

1. First ordered
2. Second ordered

- [x] Completed task
- [ ] Pending task

---

*End of preview*`;

function DesignTab() {
  const { designPresets, setDesignPreset, resetDesign } = useSettingsStore();
  const isDefault = JSON.stringify(designPresets) === JSON.stringify(DEFAULT_DESIGN);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
      <PreviewDocButton />

      {!isDefault && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
          <button onClick={resetDesign} style={{ fontSize: "11px", color: "var(--color-text-tertiary)", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}>
            <RotateCcw size={10} /> 기본으로 초기화
          </button>
        </div>
      )}

      {DESIGN_SECTIONS.map(({ key, label, preview }) => (
        <div key={key} style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "8px" }}>
            {label}
          </div>
          {/* 미리보기 */}
          <div style={{ padding: "12px 14px", marginBottom: "8px" }}>
            {preview(designPresets[key])}
          </div>
          {/* 스타일 선택 */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {DESIGN_OPTIONS[key].map((opt) => {
              const active = designPresets[key] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setDesignPreset(key, opt.value)}
                  style={{
                    padding: "5px 12px", fontSize: "11px", fontWeight: active ? 600 : 400,
                    borderRadius: "6px", cursor: "pointer",
                    border: active ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border-input)",
                    background: active ? "var(--color-accent-subtle)" : "var(--color-bg-primary)",
                    color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FontTab({ currentFont, currentCodeFont, onApply, onApplyCodeFont }: {
  currentFont: string; currentCodeFont: string;
  onApply: (v: string) => void; onApplyCodeFont: (v: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState("popular");
  const [selectedFont, setSelectedFont] = useState<FontItem | null>(null);
  const [selectedCodeFont, setSelectedCodeFont] = useState(currentCodeFont);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());

  const category = CATEGORIES.find((c) => c.id === selectedCategory)!;

  // 본문 폰트 로드
  useEffect(() => {
    const families = category.fonts.map((f) => f.family).filter((f) => !loadedFonts.has(f));
    if (families.length === 0) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = buildFontUrl(families);
    document.head.appendChild(link);
    setLoadedFonts((prev) => { const n = new Set(prev); families.forEach((f) => n.add(f)); return n; });
  }, [selectedCategory]);

  // 코드 폰트 로드
  useEffect(() => {
    const toLoad = Object.values(CODE_FONT_GOOGLE_FAMILIES).filter((f) => f && !loadedFonts.has(f));
    if (toLoad.length === 0) return;
    toLoad.forEach((family) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}&display=swap`;
      document.head.appendChild(link);
    });
    setLoadedFonts((prev) => { const n = new Set(prev); toLoad.forEach((f) => n.add(f)); return n; });
  }, []);

  const previewFont = selectedFont ? `"${selectedFont.family}", sans-serif` : getFontFamily(currentFont);
  const previewCodeFont = getCodeFontFamily(selectedCodeFont);
  const hasChanges = (selectedFont && selectedFont.value !== currentFont) || selectedCodeFont !== currentCodeFont;

  // 언어별 코드 폰트
  const CODE_FONTS_BY_LANG: Record<string, { value: string; label: string }[]> = {
    popular: [
      { value: "system-mono", label: "시스템 기본" },
      { value: "cascadia", label: "Cascadia Code" },
      { value: "fira-code", label: "Fira Code" },
      { value: "jetbrains-mono", label: "JetBrains Mono" },
      { value: "source-code-pro", label: "Source Code Pro" },
      { value: "consolas", label: "Consolas" },
    ],
    ko: [
      { value: "system-mono", label: "시스템 기본" },
      { value: "d2coding", label: "D2Coding" },
      { value: "nanum-gothic-coding", label: "나눔고딕코딩" },
      { value: "cascadia", label: "Cascadia Code" },
      { value: "fira-code", label: "Fira Code" },
      { value: "jetbrains-mono", label: "JetBrains Mono" },
    ],
    ja: [
      { value: "system-mono", label: "시스템 기본" },
      { value: "cascadia", label: "Cascadia Code" },
      { value: "fira-code", label: "Fira Code" },
      { value: "jetbrains-mono", label: "JetBrains Mono" },
    ],
  };
  const codeFontsForCategory = CODE_FONTS_BY_LANG[selectedCategory] ?? CODE_FONTS_BY_LANG.popular;

  // 언어별 미리보기 텍스트
  const PREVIEW_TEXTS: Record<string, string> = {
    popular: "The quick brown fox jumps over the lazy dog. 0123456789",
    en: "Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!",
    ko: "키스의 고유조건은 입술끼리 , 만, 나, 는 것이다. ABCDabcd 0123",
    ja: "いろはにほへと ちりぬるを わかよたれそ つねならむ。ABCD 0123",
    zh: "天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。ABCD 0123",
    es: "El pingüino Wenceslao hizo kilómetros bajo exhaustiva lluvia y frío.",
    fr: "Portez ce vieux whisky au juge blond qui fume sur son île intérieure.",
    de: "Falsches Üben von Xylophonmusik quält jeden größeren Zwerg.",
  };
  const previewText = PREVIEW_TEXTS[selectedCategory] ?? PREVIEW_TEXTS.popular;

  return (<>
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
      {/* 언어 선택 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "16px" }}>
        {["popular", "en", "zh", "es", "fr", "de", "ja", "ko"].map((id) => {
          const cat = CATEGORIES.find((c) => c.id === id)!;
          const active = selectedCategory === id;
          return (
            <button key={id} onClick={() => { setSelectedCategory(id); setSelectedFont(null); }} style={{
              padding: "4px 10px", fontSize: "11px", fontWeight: active ? 600 : 400,
              borderRadius: "4px", border: "none", cursor: "pointer", flexShrink: 0,
              background: active ? "var(--color-accent-subtle)" : "transparent",
              color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
            }}>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 본문 폰트 */}
      <SectionTitle>본문</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "16px" }}>
        {category.fonts.map((font) => {
          const isSelected = selectedFont ? selectedFont.value === font.value : currentFont === font.value;
          return (
            <button key={font.value} onClick={() => setSelectedFont(font)} style={{
              padding: "5px 12px", fontSize: "12px", fontWeight: isSelected ? 600 : 400,
              fontFamily: `"${font.family}", sans-serif`,
              borderRadius: "6px", cursor: "pointer",
              border: isSelected ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border-input)",
              background: isSelected ? "var(--color-accent-subtle)" : "var(--color-bg-primary)",
              color: isSelected ? "var(--color-accent)" : "var(--color-text-primary)",
              transition: "all 0.15s",
            }}>
              {font.label}
            </button>
          );
        })}
      </div>

      {/* 코드 폰트 */}
      <SectionTitle>코드</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "16px" }}>
        {codeFontsForCategory.map((opt) => {
          const isSelected = selectedCodeFont === opt.value;
          return (
            <button key={opt.value} onClick={() => setSelectedCodeFont(opt.value)} style={{
              padding: "5px 12px", fontSize: "12px", fontWeight: isSelected ? 600 : 400,
              fontFamily: getCodeFontFamily(opt.value),
              borderRadius: "6px", cursor: "pointer",
              border: isSelected ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border-input)",
              background: isSelected ? "var(--color-accent-subtle)" : "var(--color-bg-primary)",
              color: isSelected ? "var(--color-accent)" : "var(--color-text-primary)",
              transition: "all 0.15s",
            }}>
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* 미리보기 */}
      <SectionTitle>미리보기</SectionTitle>
      <div style={{
        padding: "12px 16px", borderRadius: "6px",
        border: "1px solid var(--color-border-light)",
        fontFamily: previewFont, fontSize: "14px", lineHeight: 1.7,
        color: "var(--color-text-primary)", marginBottom: "8px",
      }}>
        <div style={{ fontWeight: 700, fontSize: "18px", marginBottom: "6px" }}>Typography Preview</div>
        <div style={{ marginBottom: "8px" }}>
          {previewText}
        </div>
        <div style={{ marginBottom: "6px" }}>
          <code style={{
            fontFamily: previewCodeFont, fontSize: "12px",
            background: "var(--color-bg-secondary)", padding: "1px 4px", borderRadius: "3px",
          }}>const hello = "world";</code> 인라인 코드
        </div>
        <pre style={{
          fontFamily: previewCodeFont, fontSize: "12px", lineHeight: 1.5,
          background: "#1e1e2e", color: "#cdd6f4",
          padding: "8px 10px", borderRadius: "4px", margin: 0,
        }}>{({
          popular: `// Hello World\nfunction greet(name) {\n  return "Hello, " + name;\n}`,
          en: `// Greeting function\nfunction greet(name) {\n  return "Hello, " + name;\n}`,
          ko: `// 인사 함수\nfunction greet(name) {\n  return "안녕, " + name;\n}`,
          ja: `// 挨拶関数\nfunction greet(name) {\n  return "こんにちは、" + name;\n}`,
          zh: `// 问候函数\nfunction greet(name) {\n  return "你好，" + name;\n}`,
          es: `// Función de saludo\nfunction greet(name) {\n  return "Hola, " + name;\n}`,
          fr: `// Fonction de salutation\nfunction greet(name) {\n  return "Bonjour, " + name;\n}`,
          de: `// Begrüßungsfunktion\nfunction greet(name) {\n  return "Hallo, " + name;\n}`,
        }[selectedCategory] || `function greet(name) {\n  return "Hello, " + name;\n}`)}</pre>
      </div>
    </div>

    {/* 하단 */}
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px", borderTop: "1px solid var(--color-border-light)",
    }}>
      <button onClick={() => { setSelectedFont({ value: "system", label: "시스템 기본", family: "-apple-system, BlinkMacSystemFont, sans-serif", type: "sans" }); setSelectedCodeFont("cascadia"); }}
        style={{ fontSize: "12px", color: "var(--color-text-tertiary)", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
      ><RotateCcw size={10} /> 기본값으로</button>
      <button
        onClick={() => { if (selectedFont) onApply(selectedFont.value); if (selectedCodeFont !== currentCodeFont) onApplyCodeFont(selectedCodeFont); }}
        disabled={!hasChanges}
        style={{
          padding: "6px 16px", fontSize: "12px", fontWeight: 600,
          background: hasChanges ? "var(--color-accent)" : "var(--color-bg-active)",
          color: hasChanges ? "#fff" : "var(--color-text-tertiary)",
          border: "none", borderRadius: "6px", cursor: hasChanges ? "pointer" : "default",
        }}
      >적용하기</button>
    </div>
  </>);
}

function PreviewDocButton() {
  const openPreviewDoc = () => {
    const { openTab, tabs, setActiveTab } = useAppStore.getState();
    const existing = tabs.find((t) => t.title === "Design Preview");
    if (existing) {
      setActiveTab(existing.id);
    } else {
      openTab("", "Design Preview", DESIGN_PREVIEW_MD);
    }
  };
  return (
    <button
      onClick={openPreviewDoc}
      style={{
        display: "flex", alignItems: "center", gap: "6px", width: "100%",
        padding: "8px 12px", fontSize: "12px", fontWeight: 500,
        borderRadius: "6px", cursor: "pointer",
        border: "1px solid var(--color-border-input)",
        background: "var(--color-bg-primary)", color: "var(--color-text-primary)",
        marginBottom: "16px", transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.color = "var(--color-accent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-input)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
    >
      <FileText size={14} />
      미리보기 문서 열기
    </button>
  );
}

/* ── 메인 패널 ── */

export function SettingsPanel() {
  const { settings, updateSetting, applyPreset, resetToDefault, setShowSettings, themeMode, setThemeMode, accentColor, setAccentColor, spacingStyle, setSpacingStyle, codeFontFamily, setCodeFontFamily } =
    useSettingsStore();

  const [activeTab, setActiveTab] = useState<"settings" | "docstyle" | "design" | "font">("settings");

  // ESC로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSettings(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setShowSettings]);

  return (
    <>
    <div onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: "400px", zIndex: 100,
      background: "var(--color-bg-elevated)", borderLeft: "1px solid var(--color-border-medium)",
      boxShadow: "-4px 0 16px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column",
    }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--color-border-light)" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {([["settings", "설정"], ["docstyle", "스타일"], ["design", "디자인"], ["font", "글꼴"]] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: "6px 0", fontSize: "12px", fontWeight: activeTab === tab ? 600 : 400,
                width: "72px", textAlign: "center",
                borderRadius: "4px", border: "none", cursor: "pointer",
                background: activeTab === tab ? "var(--color-accent-subtle)" : "transparent",
                color: activeTab === tab ? "var(--color-accent)" : "var(--color-text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowSettings(false)}
          style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)", display: "flex", padding: "2px" }}
        >
          <X size={16} />
        </button>
      </div>

      {activeTab === "settings" ? (
      <>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          <PreviewDocButton />

          {/* 테마 */}
          <SectionTitle>테마</SectionTitle>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>배경</span>
              <ResetButton onClick={() => setThemeMode("newspaper")} visible={themeMode !== "newspaper"} />
            </div>
            <ToggleButtons
              options={[
                { value: "light", label: "라이트", icon: <Sun size={12} /> },
                { value: "newspaper", label: "뉴스페이퍼", icon: <BookOpen size={12} /> },
                { value: "charcoal", label: "차콜", icon: <CloudMoon size={12} /> },
                { value: "dark", label: "다크", icon: <Moon size={12} /> },
              ]}
              value={themeMode}
              onChange={(v) => setThemeMode(v as "light" | "newspaper" | "charcoal" | "dark")}
            />
          </div>
          <div style={{ marginBottom: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>강조 색상</span>
              <ResetButton onClick={() => setAccentColor("navy")} visible={accentColor !== "navy"} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAccentColor(opt.value)}
                  title={opt.label}
                  style={{
                    width: "24px", height: "24px", borderRadius: "50%", background: opt.color,
                    border: accentColor === opt.value ? "2.5px solid var(--color-text-primary)" : "2px solid transparent",
                    outline: accentColor === opt.value ? "2px solid var(--color-bg-elevated)" : "none",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ height: "1px", background: "var(--color-border-light)", margin: "16px 0" }} />

          {/* 글꼴 */}
          <SectionTitle>글꼴</SectionTitle>
          <button
            onClick={() => setActiveTab("font")}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 16px", fontSize: "13px", fontWeight: 500,
              fontFamily: getFontFamily(settings.fontFamily),
              borderRadius: "6px", cursor: "pointer",
              border: "1px solid var(--color-border-light)",
              background: "var(--color-bg-elevated)",
              color: "var(--color-text-primary)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-light)"; }}
          >
            <Type size={14} style={{ color: "var(--color-accent)" }} />
            {FONT_OPTIONS.find((o) => o.value === settings.fontFamily)?.label ?? settings.fontFamily}
          </button>

          <div style={{ height: "1px", background: "var(--color-border-light)", margin: "16px 0" }} />

          {/* 저장 */}
          <SectionTitle>저장</SectionTitle>
          <SaveModeSetting />


        </div>

        {/* 푸터 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "12px 16px", borderTop: "1px solid var(--color-border-light)" }}>
          <button
            onClick={resetToDefault}
            style={{ fontSize: "12px", color: "var(--color-text-tertiary)", background: "transparent", border: "none", cursor: "pointer", transition: "color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
          >
            기본값으로 초기화
          </button>
        </div>
      </>
      ) : activeTab === "docstyle" ? (<>
        <DocStyleTab settings={settings} updateSetting={updateSetting} applyPreset={applyPreset} spacingStyle={spacingStyle} setSpacingStyle={setSpacingStyle} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "12px 16px", borderTop: "1px solid var(--color-border-light)" }}>
          <button onClick={resetToDefault} style={{ fontSize: "12px", color: "var(--color-text-tertiary)", background: "transparent", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
          >기본값으로 초기화</button>
        </div>
      </>) : activeTab === "design" ? (<>
        <DesignTab />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "12px 16px", borderTop: "1px solid var(--color-border-light)" }}>
          <button onClick={() => useSettingsStore.getState().resetDesign()} style={{ fontSize: "12px", color: "var(--color-text-tertiary)", background: "transparent", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
          >기본값으로 초기화</button>
        </div>
      </>) : (
        <FontTab currentFont={settings.fontFamily} currentCodeFont={codeFontFamily}
          onApply={(v) => updateSetting("fontFamily", v)} onApplyCodeFont={setCodeFontFamily} />
      )}

    </div>
    </>
  );
}
