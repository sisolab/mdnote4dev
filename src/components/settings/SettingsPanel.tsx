import { useEffect, useState } from "react";
import {
  useSettingsStore,
  PRESETS,
  FONT_OPTIONS,
  ACCENT_OPTIONS,
  DEFAULT_SETTINGS,
  SAVE_MODE_OPTIONS,
  SPACING_STYLES,
  getFontFamily,
  type EditorSettings,
  type SaveMode,
  type SpacingStyleName,
} from "@/stores/settingsStore";
import { Sun, Moon, BookOpen, CloudMoon, Minimize2, AlignCenter, Maximize2, SlidersHorizontal, RotateCcw, Type, X } from "lucide-react";
import { FontPreview } from "./FontPreview";

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
    <h3 style={{ fontSize: "11px", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
      {children}
    </h3>
  );
}

function SettingRow({ label, children, onReset, changed }: { label: string; children: React.ReactNode; onReset?: () => void; changed?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "36px", padding: "4px 0", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>{label}</span>
        {onReset && <ResetButton onClick={onReset} visible={!!changed} />}
      </div>
      {children}
    </div>
  );
}

function formatNum(n: number, decimals?: number): string {
  if (decimals !== undefined) return n.toFixed(decimals);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

function ChipSetting({
  label, value, options, unit, decimals, onChange, defaultValue,
}: {
  label: string; value: number; options: number[]; unit: string; decimals?: number; onChange: (v: number) => void; defaultValue?: number;
}) {
  return (
    <SettingRow label={label} onReset={defaultValue !== undefined ? () => onChange(defaultValue) : undefined} changed={defaultValue !== undefined && Math.abs(value - defaultValue) > 0.001}>
      <div style={{ display: "inline-flex", borderRadius: "6px", border: "1px solid var(--color-border-input)", overflow: "hidden" }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: "5px 10px", fontSize: "12px", fontWeight: value === opt ? 600 : 400,
              border: "none", cursor: "pointer", position: "relative",
              fontFamily: "inherit",
              background: "var(--color-bg-primary)",
              color: value === opt ? "var(--color-accent)" : "var(--color-text-primary)",
              transition: "all 0.15s",
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
            }}
          >
            {formatNum(opt, decimals)}{unit}
            <div style={{
              position: "absolute", bottom: "0", left: "50%", transform: "translateX(-50%)",
              width: value === opt ? "60%" : "0%", height: "2px", borderRadius: "1px",
              background: "var(--color-accent)", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }} />
          </button>
        ))}
      </div>
    </SettingRow>
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
    <div style={{ display: "flex", borderRadius: "6px", border: "1px solid var(--color-border-input)", overflow: "hidden" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
            padding: "5px 12px", fontSize: "12px", fontWeight: value === opt.value ? 600 : 500,
            border: "none", cursor: "pointer", position: "relative",
            fontFamily: "inherit",
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
          background: isCustom ? "rgba(136,136,136,0.08)" : "var(--color-bg-primary)",
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
        background: isCustom ? "rgba(136,136,136,0.08)" : "var(--color-bg-primary)",
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

  const typoKeys: (keyof EditorSettings)[] = ["fontSize", "lineHeight", "letterSpacing", "paragraphSpacing", "headingScale"];
  const layoutKeys: (keyof EditorSettings)[] = ["editorMaxWidth", "editorPaddingX", "editorPaddingY"];
  const codeKeys: (keyof EditorSettings)[] = ["codeFontSize", "codeLineHeight", "codePadding"];

  const presetIcons: Record<string, React.ReactNode> = {
    "컴팩트": <Minimize2 size={12} />,
    "기본": <AlignCenter size={12} />,
    "여유로운": <Maximize2 size={12} />,
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
      {/* 프리셋 저장 */}
      <SectionTitle>프리셋</SectionTitle>
      <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
        <input
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newPresetName.trim()) {
              addSavedPreset({ name: newPresetName.trim(), settings: { ...settings } });
              setNewPresetName("");
            }
          }}
          placeholder="프리셋 이름"
          style={{
            flex: 1, fontSize: "11px", padding: "4px 8px",
            borderRadius: "4px", border: "1px solid var(--color-border-input)",
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
            padding: "4px 10px", fontSize: "10px", fontWeight: 600,
            borderRadius: "4px", border: "none", cursor: newPresetName.trim() ? "pointer" : "default",
            background: newPresetName.trim() ? "var(--color-accent)" : "var(--color-bg-hover)",
            color: newPresetName.trim() ? "#fff" : "var(--color-text-muted)",
          }}
        >
          저장
        </button>
      </div>
      {/* 프리셋 버튼 목록 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "16px" }}>
        {savedPresets.map((p) => {
          const active = isPresetMatch(p.settings);
          return (
            <div key={p.name} style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <button
                onClick={() => applyPreset(p.settings)}
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "4px 10px", fontSize: "11px", fontWeight: active ? 600 : 400,
                  borderRadius: "4px", cursor: "pointer",
                  border: active ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border-medium)",
                  background: active ? "var(--color-accent-subtle)" : "var(--color-bg-primary)",
                  color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                  paddingRight: "22px",
                  transition: "all 0.15s",
                }}
              >
                {presetIcons[p.name] || <SlidersHorizontal size={11} />}
                {p.name}
              </button>
              <button
                onClick={() => removeSavedPreset(p.name)}
                style={{
                  position: "absolute", right: "3px", top: "50%", transform: "translateY(-50%)",
                  width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center",
                  border: "none", background: "transparent", cursor: "pointer",
                  color: "var(--color-text-muted)", borderRadius: "2px",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; }}
              >
                <X size={9} />
              </button>
            </div>
          );
        })}
      </div>

      {/* 타이포그래피 */}
      <SectionTitle>타이포그래피</SectionTitle>
      <SectionPresetButtons keys={typoKeys} settings={settings} color="#d4845a" onApply={applySectionPreset} />
      <CompactSlider label="글자 크기" value={settings.fontSize} min={13} max={18} step={1} unit="px" defaultValue={DEFAULT_SETTINGS.fontSize} onChange={(v) => updateSetting("fontSize", v)} />
      <CompactSlider label="줄 간격" value={settings.lineHeight} min={1.4} max={2.0} step={0.1} unit="" decimals={1} defaultValue={DEFAULT_SETTINGS.lineHeight} onChange={(v) => updateSetting("lineHeight", v)} />
      <CompactSlider label="자간" value={settings.letterSpacing} min={-0.2} max={0.4} step={0.1} unit="px" decimals={1} defaultValue={DEFAULT_SETTINGS.letterSpacing} onChange={(v) => updateSetting("letterSpacing", v)} />
      <CompactSlider label="문단 간격" value={settings.paragraphSpacing} min={0} max={0.8} step={0.1} unit="rem" decimals={1} defaultValue={DEFAULT_SETTINGS.paragraphSpacing} onChange={(v) => updateSetting("paragraphSpacing", v)} />
      <CompactSlider label="제목 배율" value={settings.headingScale} min={1.1} max={1.5} step={0.1} unit="×" decimals={1} defaultValue={DEFAULT_SETTINGS.headingScale} onChange={(v) => updateSetting("headingScale", v)} />

      <div style={{ height: "1px", background: "var(--color-border-light)", margin: "16px 0" }} />

      {/* 레이아웃 */}
      <SectionTitle>레이아웃</SectionTitle>
      <SectionPresetButtons keys={layoutKeys} settings={settings} color="#1a73e8" onApply={applySectionPreset} />
      <CompactSlider label="에디터 최대폭" value={settings.editorMaxWidth} min={600} max={880} step={20} unit="px" defaultValue={DEFAULT_SETTINGS.editorMaxWidth} onChange={(v) => updateSetting("editorMaxWidth", v)} />
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
      <SettingRow label="저장 모드" onReset={() => { setPending("manual"); setSaveMode("manual"); }} changed={saveMode !== "manual"}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <select
            value={pending}
            onChange={(e) => setPending(e.target.value as SaveMode)}
            style={{
              fontSize: "12px", fontWeight: 500, padding: "5px 10px",
              borderRadius: "6px", border: "1px solid var(--color-border-input)",
              background: "var(--color-bg-primary)", color: "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            {SAVE_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {changed && (
            <button
              onClick={() => setSaveMode(pending)}
              style={{
                padding: "4px 10px", fontSize: "11px", fontWeight: 600,
                background: "var(--color-accent)", color: "#fff",
                border: "none", borderRadius: "4px", cursor: "pointer",
              }}
            >
              적용
            </button>
          )}
        </div>
      </SettingRow>
      <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", marginTop: "-4px", marginBottom: "4px" }}>
        {SAVE_MODE_OPTIONS.find((o) => o.value === pending)?.desc}
      </div>
    </>
  );
}

/* ── 메인 패널 ── */

export function SettingsPanel() {
  const { settings, updateSetting, applyPreset, resetToDefault, setShowSettings, themeMode, setThemeMode, accentColor, setAccentColor, tabSize, setTabSize, spacingStyle, setSpacingStyle, codeFontFamily, setCodeFontFamily } =
    useSettingsStore();

  const [showFontPreview, setShowFontPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "docstyle">("settings");

  // ESC로 닫기 (글꼴 미리보기가 열려있으면 무시)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showFontPreview) setShowSettings(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setShowSettings, showFontPreview]);

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
          {([["settings", "설정"], ["docstyle", "문서 스타일"]] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: "4px 12px", fontSize: "12px", fontWeight: activeTab === tab ? 600 : 400,
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

          {/* 테마 */}
          <SectionTitle>테마</SectionTitle>
          <SettingRow label="배경" onReset={() => setThemeMode("newspaper")} changed={themeMode !== "newspaper"}>
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
          </SettingRow>
          <SettingRow label="강조 색상" onReset={() => setAccentColor("blue")} changed={accentColor !== "blue"}>
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
          </SettingRow>

          <div style={{ height: "1px", background: "var(--color-border-light)", margin: "16px 0" }} />

          {/* 글꼴 (프리셋 독립) */}
          <SectionTitle>글꼴</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setShowFontPreview(true)}
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
            <ResetButton onClick={() => updateSetting("fontFamily", "system")} visible={settings.fontFamily !== "system"} />
          </div>

          <div style={{ height: "1px", background: "var(--color-border-light)", margin: "16px 0" }} />

          {/* 저장 */}
          <SectionTitle>저장</SectionTitle>
          <SaveModeSetting />

          <div style={{ height: "1px", background: "var(--color-border-light)", margin: "16px 0" }} />

          {/* 코드 */}
          <SectionTitle>코드</SectionTitle>
          <ChipSetting label="탭 크기" value={tabSize} options={[2, 4]} unit="칸" defaultValue={2} onChange={(v) => setTabSize(v as 2 | 4)} />

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
      ) : (
        <DocStyleTab settings={settings} updateSetting={updateSetting} applyPreset={applyPreset} spacingStyle={spacingStyle} setSpacingStyle={setSpacingStyle} />
      )}

      {showFontPreview && (
        <FontPreview
          currentFont={settings.fontFamily}
          currentCodeFont={codeFontFamily}
          onApply={(value) => updateSetting("fontFamily", value)}
          onApplyCodeFont={(value) => setCodeFontFamily(value)}
          onClose={() => setShowFontPreview(false)}
        />
      )}
    </div>
    </>
  );
}
