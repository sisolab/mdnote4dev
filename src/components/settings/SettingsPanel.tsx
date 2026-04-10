import { useEffect, useState, useRef, useCallback } from "react";
import {
  useSettingsStore,
  PRESETS,
  FONT_OPTIONS,
  ACCENT_OPTIONS,
  DEFAULT_SETTINGS,
  getFontFamily,
  type EditorSettings,
} from "@/stores/settingsStore";
import { Sun, Moon, Minimize2, AlignCenter, Maximize2, SlidersHorizontal, RotateCcw, Type, X } from "lucide-react";
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
      <div style={{ display: "flex", borderRadius: "6px", border: "1px solid var(--color-border-input)", overflow: "hidden", width: "240px" }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              width: `${240 / 6}px`, padding: "5px 0", fontSize: "12px", fontWeight: value === opt ? 600 : 400,
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
        flex: 1, padding: "8px 16px", borderRadius: "8px", textAlign: "center" as const,
        border: isActive ? `1.5px solid ${color}` : "1px solid var(--color-border-light)",
        background: isActive ? `${color}15` : "var(--color-bg-elevated)",
        cursor: "pointer", transition: "all 0.15s",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
      }}
    >
      {icon && <span style={{ color }}>{icon}</span>}
      <span style={{ fontSize: "13px", fontWeight: 600, color }}>
        {name}
      </span>
    </button>
  );
}

/* ── 메인 패널 ── */

export function SettingsPanel() {
  const { settings, updateSetting, applyPreset, resetToDefault, setShowSettings, themeMode, setThemeMode, accentColor, setAccentColor } =
    useSettingsStore();

  const [showFontPreview, setShowFontPreview] = useState(false);

  const isPresetActive = (preset: EditorSettings) =>
    JSON.stringify(settings) === JSON.stringify(preset);

  // ESC로 닫기 (글꼴 미리보기가 열려있으면 무시)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showFontPreview) setShowSettings(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setShowSettings, showFontPreview]);

  // 드래그 이동
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, select, input")) return;
    isDragging.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = pos ?? { x: (window.innerWidth - 520) / 2, y: 60 };

    const handleMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const panelW = 520;
      const panelH = Math.min(window.innerHeight - 120, 700);
      const newX = Math.max(0, Math.min(window.innerWidth - panelW, startPos.x + (e.clientX - startX)));
      const newY = Math.max(0, Math.min(window.innerHeight - panelH, startPos.y + (e.clientY - startY)));
      setPos({ x: newX, y: newY });
    };
    const handleUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.userSelect = "";
    };
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }, [pos]);

  return (
    <div
      onClick={() => setShowSettings(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.15)", animation: "fadeIn 0.15s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          left: pos ? `${pos.x}px` : "50%",
          top: pos ? `${pos.y}px` : "60px",
          transform: pos ? "none" : "translateX(-50%)",
          width: "520px", maxHeight: "calc(100vh - 120px)",
          background: "var(--color-bg-elevated)", borderRadius: "12px",
          border: "1px solid var(--color-border-medium)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* 헤더 */}
        <div onMouseDown={handleDragStart} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--color-border-light)", cursor: "grab" }}>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-heading)" }}>설정</span>
          <button
            onClick={() => setShowSettings(false)}
            style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)", transition: "all 0.1s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* 테마 */}
          <SectionTitle>테마</SectionTitle>
          <SettingRow label="배경" onReset={() => setThemeMode("light")} changed={themeMode !== "light"}>
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

          {/* 프리셋 + 프리셋 항목들 */}
          <SectionTitle>에디터 프리셋</SectionTitle>
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
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
            {/* 커스텀 — 3개 프리셋에 해당 안 되면 자동 활성화 */}
            {(() => {
              const isCustom = !PRESETS.some((p) => isPresetActive(p.settings));
              return (
                <div
                  style={{
                    flex: 1, padding: "8px 16px", borderRadius: "8px", textAlign: "center",
                    border: isCustom ? "1.5px solid #7c3aed" : "1px solid var(--color-border-light)",
                    background: isCustom ? "#7c3aed15" : "var(--color-bg-elevated)",
                    opacity: isCustom ? 1 : 0.5,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}
                >
                  <SlidersHorizontal size={14} style={{ color: "#a78bfa" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#a78bfa" }}>
                    커스텀
                  </span>
                </div>
              );
            })()}
          </div>

          {/* 타이포그래피 */}
          <SectionTitle>타이포그래피</SectionTitle>
          <ChipSetting label="글자 크기" value={settings.fontSize} options={[12, 13, 14, 15, 16, 17]} unit="" defaultValue={DEFAULT_SETTINGS.fontSize} onChange={(v) => updateSetting("fontSize", v)} />
          <ChipSetting label="줄 간격" value={settings.lineHeight} options={[1.2, 1.4, 1.6, 1.8, 2.0, 2.2]} unit="" decimals={1} defaultValue={DEFAULT_SETTINGS.lineHeight} onChange={(v) => updateSetting("lineHeight", v)} />
          <ChipSetting label="자간" value={settings.letterSpacing} options={[-0.2, 0, 0.1, 0.2, 0.3, 0.4]} unit="" decimals={1} defaultValue={DEFAULT_SETTINGS.letterSpacing} onChange={(v) => updateSetting("letterSpacing", v)} />
          <ChipSetting label="문단 간격" value={settings.paragraphSpacing} options={[0, 0.2, 0.4, 0.6, 0.8, 1.0]} unit="" decimals={1} defaultValue={DEFAULT_SETTINGS.paragraphSpacing} onChange={(v) => updateSetting("paragraphSpacing", v)} />
          <ChipSetting label="제목 배율" value={settings.headingScale} options={[1.1, 1.2, 1.3, 1.4, 1.5, 1.6]} unit="" decimals={1} defaultValue={DEFAULT_SETTINGS.headingScale} onChange={(v) => updateSetting("headingScale", v)} />

          {/* 코드 블록 */}
          <div style={{ marginTop: "16px" }} />
          <SectionTitle>코드 블록</SectionTitle>
          <ChipSetting label="글자 크기" value={settings.codeFontSize} options={[11, 12, 13, 14, 15, 16]} unit="" defaultValue={DEFAULT_SETTINGS.codeFontSize} onChange={(v) => updateSetting("codeFontSize", v)} />
          <ChipSetting label="줄 간격" value={settings.codeLineHeight} options={[1.2, 1.4, 1.6, 1.8, 2.0, 2.2]} unit="" decimals={1} defaultValue={DEFAULT_SETTINGS.codeLineHeight} onChange={(v) => updateSetting("codeLineHeight", v)} />
          <ChipSetting label="패딩" value={settings.codePadding} options={[4, 8, 12, 16, 20, 24]} unit="" defaultValue={DEFAULT_SETTINGS.codePadding} onChange={(v) => updateSetting("codePadding", v)} />

          {/* 에디터 영역 (프리셋 포함) */}
          <div style={{ marginTop: "16px" }} />
          <SectionTitle>에디터 영역</SectionTitle>
          <ChipSetting label="최대 폭" value={settings.editorMaxWidth} options={[640, 720, 780, 860, 960, 1080]} unit="" defaultValue={DEFAULT_SETTINGS.editorMaxWidth} onChange={(v) => updateSetting("editorMaxWidth", v)} />

        </div>

        {/* 푸터 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "12px 24px", borderTop: "1px solid var(--color-border-light)", background: "var(--color-bg-secondary)" }}>
          <button
            onClick={resetToDefault}
            style={{ fontSize: "12px", color: "var(--color-text-tertiary)", background: "transparent", border: "none", cursor: "pointer", transition: "color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
          >
            기본값으로 초기화
          </button>
        </div>
      </div>

      {showFontPreview && (
        <FontPreview
          currentFont={settings.fontFamily}
          onApply={(value) => updateSetting("fontFamily", value)}
          onClose={() => setShowFontPreview(false)}
        />
      )}
    </div>
  );
}
