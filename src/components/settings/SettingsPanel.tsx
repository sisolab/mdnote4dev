import {
  useSettingsStore,
  PRESETS,
  FONT_OPTIONS,
  type EditorSettings,
} from "@/stores/settingsStore";
import { X } from "lucide-react";

function SliderSetting({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-text-primary">{label}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-32 h-1.5 rounded-full appearance-none bg-border-medium accent-accent cursor-pointer"
        />
        <span className="text-[12px] text-text-tertiary w-14 text-right tabular-nums">
          {value}{unit}
        </span>
      </div>
    </div>
  );
}

function PresetCard({
  name,
  description,
  settings,
  isActive,
  onApply,
}: {
  name: string;
  description: string;
  settings: EditorSettings;
  isActive: boolean;
  onApply: (s: EditorSettings) => void;
}) {
  return (
    <button
      onClick={() => onApply(settings)}
      className={`flex-1 p-4 rounded-xl border text-left transition-all ${
        isActive
          ? "border-accent bg-accent-subtle shadow-md"
          : "border-border-light bg-bg-elevated hover:border-border-medium hover:shadow-md shadow-sm"
      }`}
    >
      <div className={`text-[13px] font-semibold mb-1 ${isActive ? "text-accent" : "text-text-primary"}`}>
        {name}
      </div>
      <div className="text-[11px] text-text-tertiary leading-relaxed">{description}</div>
    </button>
  );
}

export function SettingsPanel() {
  const { settings, updateSetting, applyPreset, resetToDefault, setShowSettings } =
    useSettingsStore();

  const isPresetActive = (preset: EditorSettings) =>
    JSON.stringify(settings) === JSON.stringify(preset);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[60px] bg-[rgba(0,0,0,0.35)] animate-[fadeIn_0.15s]">
      <div className="w-[560px] max-h-[calc(100vh-120px)] bg-bg-elevated rounded-xl shadow-lg border border-border-medium flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <h2 className="text-[15px] font-semibold text-text-heading">에디터 설정</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-bg-hover text-text-light hover:text-text-secondary transition-all duration-[0.1s]"
          >
            <X size={16} />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 프리셋 */}
          <div>
            <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.1em] mb-3">
              프리셋
            </h3>
            <div className="flex gap-3">
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
          </div>

          {/* 구분선 */}
          <hr className="border-border-light" />

          {/* 폰트 */}
          <div>
            <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.1em] mb-2">
              타이포그래피
            </h3>
            <div className="flex items-center justify-between py-3">
              <span className="text-[13px] font-medium text-text-primary">글꼴</span>
              <select
                value={settings.fontFamily}
                onChange={(e) => updateSetting("fontFamily", e.target.value)}
                className="text-[13px] px-3 py-1.5 rounded-lg border border-border-light bg-bg-primary text-text-primary outline-none focus:border-accent transition-colors cursor-pointer"
              >
                {FONT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <SliderSetting
              label="글자 크기"
              value={settings.fontSize}
              min={11}
              max={22}
              step={1}
              unit="px"
              onChange={(v) => updateSetting("fontSize", v)}
            />
            <SliderSetting
              label="줄 간격"
              value={settings.lineHeight}
              min={1.2}
              max={2.5}
              step={0.05}
              unit=""
              onChange={(v) => updateSetting("lineHeight", v)}
            />
            <SliderSetting
              label="자간"
              value={settings.letterSpacing}
              min={-0.5}
              max={1}
              step={0.1}
              unit="px"
              onChange={(v) => updateSetting("letterSpacing", v)}
            />
            <SliderSetting
              label="문단 간격"
              value={settings.paragraphSpacing}
              min={0}
              max={1.5}
              step={0.1}
              unit="rem"
              onChange={(v) => updateSetting("paragraphSpacing", v)}
            />
            <SliderSetting
              label="제목 배율"
              value={settings.headingScale}
              min={1.0}
              max={1.8}
              step={0.05}
              unit="x"
              onChange={(v) => updateSetting("headingScale", v)}
            />
          </div>

          <hr className="border-border-light" />

          {/* 코드 */}
          <div>
            <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.1em] mb-2">
              코드 블록
            </h3>
            <SliderSetting
              label="코드 글자 크기"
              value={settings.codeFontSize}
              min={10}
              max={18}
              step={1}
              unit="px"
              onChange={(v) => updateSetting("codeFontSize", v)}
            />
            <SliderSetting
              label="코드 줄 간격"
              value={settings.codeLineHeight}
              min={1.2}
              max={2.2}
              step={0.1}
              unit=""
              onChange={(v) => updateSetting("codeLineHeight", v)}
            />
          </div>

          <hr className="border-border-light" />

          {/* 레이아웃 */}
          <div>
            <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.1em] mb-2">
              레이아웃
            </h3>
            <div className="flex items-center justify-between py-3">
              <span className="text-[13px] font-medium text-text-primary">에디터 폭 모드</span>
              <div className="flex rounded-md border border-border-input overflow-hidden">
                <button
                  onClick={() => updateSetting("widthMode", "fluid")}
                  className={`px-3 py-1 text-[12px] font-medium transition-all duration-[0.15s] ${
                    settings.widthMode === "fluid"
                      ? "bg-accent text-white"
                      : "bg-bg-primary text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  가변폭
                </button>
                <button
                  onClick={() => updateSetting("widthMode", "fixed")}
                  className={`px-3 py-1 text-[12px] font-medium transition-all duration-[0.15s] ${
                    settings.widthMode === "fixed"
                      ? "bg-accent text-white"
                      : "bg-bg-primary text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  고정폭
                </button>
              </div>
            </div>
            <SliderSetting
              label={settings.widthMode === "fixed" ? "에디터 폭" : "에디터 최대 폭"}
              value={settings.editorMaxWidth}
              min={500}
              max={1200}
              step={20}
              unit="px"
              onChange={(v) => updateSetting("editorMaxWidth", v)}
            />
            <SliderSetting
              label="여백"
              value={settings.editorPaddingX}
              min={16}
              max={96}
              step={8}
              unit="px"
              onChange={(v) => updateSetting("editorPaddingX", v)}
            />
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-light bg-bg-secondary">
          <button
            onClick={resetToDefault}
            className="text-[12px] text-text-tertiary hover:text-text-secondary transition-all duration-[0.15s]"
          >
            기본값으로 초기화
          </button>
          <button
            onClick={() => setShowSettings(false)}
            className="px-4 py-2 text-[13px] font-medium bg-accent text-text-inverse rounded-md hover:bg-accent-hover transition-all duration-[0.15s]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
