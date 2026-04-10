import { useEffect } from "react";
import {
  useSettingsStore,
  PRESETS,
  FONT_OPTIONS,
  ACCENT_OPTIONS,
  type EditorSettings,
} from "@/stores/settingsStore";
import { X, Sun, Moon } from "lucide-react";

/* ── 공통 컴포넌트 ── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: "11px", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
      {children}
    </h3>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "36px", padding: "4px 0" }}>
      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>{label}</span>
      {children}
    </div>
  );
}

function SliderSetting({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <SettingRow label={label}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "120px", accentColor: "var(--color-accent)", cursor: "pointer" }}
        />
        <span style={{ fontSize: "11px", color: "#888", width: "48px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          {value}{unit}
        </span>
      </div>
    </SettingRow>
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
            display: "flex", alignItems: "center", gap: "5px",
            padding: "5px 12px", fontSize: "12px", fontWeight: 500,
            border: "none", cursor: "pointer",
            background: value === opt.value ? "var(--color-accent)" : "var(--color-bg-primary)",
            color: value === opt.value ? "#fff" : "var(--color-text-secondary)",
            transition: "all 0.15s",
          }}
        >
          {opt.icon}{opt.label}
        </button>
      ))}
    </div>
  );
}

function PresetCard({ name, description, settings, isActive, onApply }: {
  name: string; description: string; settings: EditorSettings; isActive: boolean; onApply: (s: EditorSettings) => void;
}) {
  return (
    <button
      onClick={() => onApply(settings)}
      style={{
        flex: 1, padding: "14px 16px", borderRadius: "8px", textAlign: "left" as const,
        border: isActive ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border-light)",
        background: isActive ? "var(--color-accent-subtle)" : "var(--color-bg-elevated)",
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px", color: isActive ? "var(--color-accent)" : "var(--color-text-primary)" }}>
        {name}
      </div>
      <div style={{ fontSize: "11px", color: "#888", lineHeight: 1.4 }}>{description}</div>
    </button>
  );
}

/* ── 메인 패널 ── */

export function SettingsPanel() {
  const { settings, updateSetting, applyPreset, resetToDefault, setShowSettings, themeMode, setThemeMode, accentColor, setAccentColor } =
    useSettingsStore();

  const isPresetActive = (preset: EditorSettings) =>
    JSON.stringify(settings) === JSON.stringify(preset);

  // ESC로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSettings(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setShowSettings]);

  return (
    <div
      onClick={() => setShowSettings(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "60px",
        background: "rgba(0,0,0,0.35)", animation: "fadeIn 0.15s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "520px", maxHeight: "calc(100vh - 120px)",
          background: "var(--color-bg-elevated)", borderRadius: "12px",
          border: "1px solid var(--color-border-medium)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--color-border-light)" }}>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-heading)" }}>설정</span>
          <button
            onClick={() => setShowSettings(false)}
            style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#999", transition: "all 0.1s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* 테마 */}
          <SectionTitle>테마</SectionTitle>
          <SettingRow label="배경">
            <ToggleButtons
              options={[
                { value: "light", label: "라이트", icon: <Sun size={12} /> },
                { value: "warm", label: "웜" },
                { value: "charcoal", label: "차콜" },
                { value: "dark", label: "다크", icon: <Moon size={12} /> },
              ]}
              value={themeMode}
              onChange={(v) => setThemeMode(v as "light" | "warm" | "charcoal" | "dark")}
            />
          </SettingRow>
          <SettingRow label="강조 색상">
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

          {/* 프리셋 */}
          <SectionTitle>에디터 프리셋</SectionTitle>
          <div style={{ display: "flex", gap: "10px", marginBottom: "4px" }}>
            {PRESETS.map((preset) => (
              <PresetCard
                key={preset.name}
                name={preset.name}
                description={preset.description}
                settings={preset.settings}
                isActive={isPresetActive(preset.settings)}
                onApply={applyPreset}
              />
            ))}
          </div>

          <div style={{ height: "1px", background: "var(--color-border-light)", margin: "16px 0" }} />

          {/* 타이포그래피 */}
          <SectionTitle>타이포그래피</SectionTitle>
          <SettingRow label="글꼴">
            <select
              value={settings.fontFamily}
              onChange={(e) => updateSetting("fontFamily", e.target.value)}
              style={{
                fontSize: "12px", padding: "5px 10px", borderRadius: "6px",
                border: "1px solid var(--color-border-input)", background: "var(--color-bg-primary)",
                color: "var(--color-text-primary)", outline: "none", cursor: "pointer",
              }}
            >
              {FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </SettingRow>
          <SliderSetting label="글자 크기" value={settings.fontSize} min={11} max={22} step={1} unit="px" onChange={(v) => updateSetting("fontSize", v)} />
          <SliderSetting label="줄 간격" value={settings.lineHeight} min={1.2} max={2.5} step={0.05} unit="" onChange={(v) => updateSetting("lineHeight", v)} />
          <SliderSetting label="자간" value={settings.letterSpacing} min={-0.5} max={1} step={0.1} unit="px" onChange={(v) => updateSetting("letterSpacing", v)} />
          <SliderSetting label="문단 간격" value={settings.paragraphSpacing} min={0} max={1.5} step={0.1} unit="rem" onChange={(v) => updateSetting("paragraphSpacing", v)} />
          <SliderSetting label="제목 배율" value={settings.headingScale} min={1.0} max={1.8} step={0.05} unit="x" onChange={(v) => updateSetting("headingScale", v)} />

          <div style={{ height: "1px", background: "var(--color-border-light)", margin: "16px 0" }} />

          {/* 코드 블록 */}
          <SectionTitle>코드 블록</SectionTitle>
          <SliderSetting label="글자 크기" value={settings.codeFontSize} min={10} max={18} step={1} unit="px" onChange={(v) => updateSetting("codeFontSize", v)} />
          <SliderSetting label="줄 간격" value={settings.codeLineHeight} min={1.2} max={2.2} step={0.1} unit="" onChange={(v) => updateSetting("codeLineHeight", v)} />

          <div style={{ height: "1px", background: "var(--color-border-light)", margin: "16px 0" }} />

          {/* 레이아웃 */}
          <SectionTitle>레이아웃</SectionTitle>
          <SettingRow label="에디터 폭 모드">
            <ToggleButtons
              options={[
                { value: "fluid", label: "가변폭" },
                { value: "fixed", label: "고정폭" },
              ]}
              value={settings.widthMode}
              onChange={(v) => updateSetting("widthMode", v as "fixed" | "fluid")}
            />
          </SettingRow>
          <SliderSetting label={settings.widthMode === "fixed" ? "에디터 폭" : "최대 폭"} value={settings.editorMaxWidth} min={500} max={1200} step={20} unit="px" onChange={(v) => updateSetting("editorMaxWidth", v)} />
          <SliderSetting label="여백" value={settings.editorPaddingX} min={16} max={96} step={8} unit="px" onChange={(v) => updateSetting("editorPaddingX", v)} />
        </div>

        {/* 푸터 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderTop: "1px solid var(--color-border-light)", background: "var(--color-bg-secondary)" }}>
          <button
            onClick={resetToDefault}
            style={{ fontSize: "12px", color: "#999", background: "transparent", border: "none", cursor: "pointer", transition: "color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#555"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#999"; }}
          >
            기본값으로 초기화
          </button>
          <button
            onClick={() => setShowSettings(false)}
            style={{
              padding: "6px 16px", fontSize: "12px", fontWeight: 600,
              background: "var(--color-accent)", color: "#fff", border: "none",
              borderRadius: "6px", cursor: "pointer", transition: "all 0.15s",
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
