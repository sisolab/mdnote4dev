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
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "28px" }}>
      <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--color-text-primary)", width: "80px", flexShrink: 0 }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: "var(--color-accent)" }}
      />
      <span style={{ fontSize: "10px", color: "var(--color-accent)", fontWeight: 600, width: "44px", textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
        {decimals ? value.toFixed(decimals) : value}{unit}
      </span>
      {isModified ? (
        <button onClick={() => onChange(defaultValue)} title="기본값으로" style={{
          width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)", flexShrink: 0,
        }}>
          <RotateCcw size={9} />
        </button>
      ) : <div style={{ width: "14px", flexShrink: 0 }} />}
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

function PresetCard({ name, icon, color, settings, isActive, onApply }: {
  name: string; icon?: React.ReactNode; color: string; settings: EditorSettings; isActive: boolean; onApply: (s: EditorSettings) => void;
}) {
  return (
    <button
      onClick={() => onApply(settings)}
      style={{
        flex: 1, padding: "8px 8px", borderRadius: "8px", textAlign: "center" as const,
        border: isActive ? `1.5px solid ${color}` : "1px solid var(--color-border-light)",
        background: isActive ? `${color}15` : "var(--color-bg-elevated)",
        cursor: "pointer", transition: "all 0.15s",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
      }}
    >
      {icon && <span style={{ color }}>{icon}</span>}
      <span style={{ fontSize: "10px", fontWeight: 600, color }}>
        {name}
      </span>
    </button>
  );
}

function SpacingSliders({ spacingStyle, setSpacingStyle }: { spacingStyle: SpacingStyleName; setSpacingStyle: (name: SpacingStyleName) => void }) {
  const ITEMS = [
    { key: "h1Mt", label: "H1 위", min: 0, max: 3, step: 0.25, unit: "rem" },
    { key: "h1Mb", label: "H1 아래", min: 0, max: 2, step: 0.25, unit: "rem" },
    { key: "h2Mt", label: "H2 위", min: 0, max: 3, step: 0.25, unit: "rem" },
    { key: "h2Mb", label: "H2 아래", min: 0, max: 2, step: 0.25, unit: "rem" },
    { key: "h3Mt", label: "H3 위", min: 0, max: 3, step: 0.25, unit: "rem" },
    { key: "h3Mb", label: "H3 아래", min: 0, max: 2, step: 0.25, unit: "rem" },
    { key: "h4Mt", label: "H4 위", min: 0, max: 3, step: 0.25, unit: "rem" },
    { key: "h4Mb", label: "H4 아래", min: 0, max: 2, step: 0.25, unit: "rem" },
    { key: "p", label: "문단", min: 0, max: 2, step: 0.1, unit: "rem" },
    { key: "li", label: "리스트", min: 0, max: 1, step: 0.05, unit: "rem" },
    { key: "pre", label: "코드블록", min: 0, max: 2, step: 0.25, unit: "rem" },
    { key: "bq", label: "인용문", min: 0, max: 2, step: 0.25, unit: "rem" },
    { key: "hr", label: "수평선", min: 0, max: 3, step: 0.25, unit: "rem" },
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
      <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
        {(Object.entries(SPACING_STYLES) as [SpacingStyleName, typeof SPACING_STYLES.default][]).map(([key, style]) => (
          <button
            key={key}
            onClick={() => selectPreset(key)}
            style={{
              padding: "4px 10px", fontSize: "10px", fontWeight: !isCustom && spacingStyle === key ? 600 : 400,
              borderRadius: "4px", cursor: "pointer",
              border: !isCustom && spacingStyle === key ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border-medium)",
              background: !isCustom && spacingStyle === key ? "var(--color-accent-subtle)" : "var(--color-bg-primary)",
              color: !isCustom && spacingStyle === key ? "var(--color-accent)" : "var(--color-text-secondary)",
            }}
          >
            {style.label}
          </button>
        ))}
        <span style={{
          padding: "4px 10px", fontSize: "10px", fontWeight: isCustom ? 600 : 400,
          borderRadius: "4px",
          border: isCustom ? "1.5px solid #7c3aed" : "1px solid var(--color-border-medium)",
          background: isCustom ? "#7c3aed15" : "var(--color-bg-primary)",
          color: isCustom ? "#7c3aed" : "var(--color-text-tertiary)",
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

function DocStyleTab({ settings, updateSetting, applyPreset, spacingStyle, setSpacingStyle }: {
  settings: EditorSettings; updateSetting: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
  applyPreset: (preset: EditorSettings) => void; spacingStyle: SpacingStyleName; setSpacingStyle: (name: SpacingStyleName) => void;
}) {
  const isPresetActive = (preset: EditorSettings) =>
    JSON.stringify(settings) === JSON.stringify(preset);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
      {/* 전체 프리셋 */}
      <SectionTitle>프리셋</SectionTitle>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {PRESETS.map((preset, i) => (
          <PresetCard
            key={preset.name}
            name={preset.name}
            icon={[<Minimize2 size={14} />, <AlignCenter size={14} />, <Maximize2 size={14} />][i]}
            color={["#d4845a", "#1a73e8", "#5ab8ad"][i]}
            settings={preset.settings}
            isActive={isPresetActive(preset.settings)}
            onApply={applyPreset}
          />
        ))}
        {(() => {
          const isCustom = !PRESETS.some((p) => isPresetActive(p.settings));
          return (
            <div style={{
              flex: 1, padding: "8px 8px", borderRadius: "8px", textAlign: "center",
              border: isCustom ? "1.5px solid #7c3aed" : "1px solid var(--color-border-light)",
              background: isCustom ? "#7c3aed15" : "var(--color-bg-elevated)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
            }}>
              <SlidersHorizontal size={14} style={{ color: isCustom ? "#7c3aed" : "#a78bfa" }} />
              <span style={{ fontSize: "10px", fontWeight: 600, color: isCustom ? "#7c3aed" : "var(--color-text-primary)" }}>커스텀</span>
            </div>
          );
        })()}
      </div>

      {/* 타이포그래피 */}
      <SectionTitle>타이포그래피</SectionTitle>
      <CompactSlider label="글자 크기" value={settings.fontSize} min={10} max={22} step={1} unit="px" defaultValue={DEFAULT_SETTINGS.fontSize} onChange={(v) => updateSetting("fontSize", v)} />
      <CompactSlider label="줄 간격" value={settings.lineHeight} min={1.0} max={2.5} step={0.1} unit="" decimals={1} defaultValue={DEFAULT_SETTINGS.lineHeight} onChange={(v) => updateSetting("lineHeight", v)} />
      <CompactSlider label="자간" value={settings.letterSpacing} min={-0.5} max={1.0} step={0.1} unit="px" decimals={1} defaultValue={DEFAULT_SETTINGS.letterSpacing} onChange={(v) => updateSetting("letterSpacing", v)} />
      <CompactSlider label="문단 간격" value={settings.paragraphSpacing} min={0} max={1.5} step={0.1} unit="rem" decimals={1} defaultValue={DEFAULT_SETTINGS.paragraphSpacing} onChange={(v) => updateSetting("paragraphSpacing", v)} />
      <CompactSlider label="제목 배율" value={settings.headingScale} min={1.0} max={2.0} step={0.1} unit="×" decimals={1} defaultValue={DEFAULT_SETTINGS.headingScale} onChange={(v) => updateSetting("headingScale", v)} />

      <div style={{ height: "1px", background: "var(--color-border-light)", margin: "12px 0" }} />

      {/* 레이아웃 */}
      <SectionTitle>레이아웃</SectionTitle>
      <CompactSlider label="에디터 최대폭" value={settings.editorMaxWidth} min={480} max={1200} step={20} unit="px" defaultValue={DEFAULT_SETTINGS.editorMaxWidth} onChange={(v) => updateSetting("editorMaxWidth", v)} />
      <CompactSlider label="좌우 패딩" value={settings.editorPaddingX} min={16} max={96} step={4} unit="px" defaultValue={DEFAULT_SETTINGS.editorPaddingX} onChange={(v) => updateSetting("editorPaddingX", v)} />
      <CompactSlider label="상하 패딩" value={settings.editorPaddingY} min={16} max={96} step={4} unit="px" defaultValue={DEFAULT_SETTINGS.editorPaddingY} onChange={(v) => updateSetting("editorPaddingY", v)} />

      <div style={{ height: "1px", background: "var(--color-border-light)", margin: "12px 0" }} />

      {/* 코드 블록 */}
      <SectionTitle>코드 블록</SectionTitle>
      <CompactSlider label="글자 크기" value={settings.codeFontSize} min={10} max={18} step={1} unit="px" defaultValue={DEFAULT_SETTINGS.codeFontSize} onChange={(v) => updateSetting("codeFontSize", v)} />
      <CompactSlider label="줄 간격" value={settings.codeLineHeight} min={1.0} max={2.5} step={0.1} unit="" decimals={1} defaultValue={DEFAULT_SETTINGS.codeLineHeight} onChange={(v) => updateSetting("codeLineHeight", v)} />
      <CompactSlider label="패딩" value={settings.codePadding} min={4} max={32} step={2} unit="px" defaultValue={DEFAULT_SETTINGS.codePadding} onChange={(v) => updateSetting("codePadding", v)} />

      <div style={{ height: "1px", background: "var(--color-border-light)", margin: "12px 0" }} />

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
