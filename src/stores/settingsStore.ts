import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface EditorSettings {
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  fontFamily: string;
  editorMaxWidth: number;
  headingScale: number;
  codeFontSize: number;
  codeLineHeight: number;
  codePadding: number;
  editorPaddingX: number;
  editorPaddingY: number;
  letterSpacing: number;
  widthMode: "fixed" | "fluid";
  pageAlign: "left" | "center";
}

export interface Preset {
  name: string;
  description: string;
  settings: EditorSettings;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 15,
  lineHeight: 1.8,
  paragraphSpacing: 0.4,
  fontFamily: "system",
  editorMaxWidth: 720,
  headingScale: 1.3,
  codeFontSize: 13,
  codeLineHeight: 1.6,
  codePadding: 12,
  editorPaddingX: 48,
  editorPaddingY: 48,
  letterSpacing: 0,
  widthMode: "fixed" as const,
  pageAlign: "center" as const,
};

export const PRESETS: Preset[] = [
  {
    name: "컴팩트",
    description: "좁은 간격, 작은 폰트. 정보를 빽빽하게 볼 때",
    settings: {
      fontSize: 13,
      lineHeight: 1.4,
      paragraphSpacing: 0.2,
      fontFamily: "system",
      headingScale: 1.2,
      codeFontSize: 12,
      codeLineHeight: 1.4,
      codePadding: 8,
      editorPaddingX: 32,
      editorPaddingY: 24,
      letterSpacing: 0,
      editorMaxWidth: 720,
      widthMode: "fixed" as const,
      pageAlign: "center" as const,
    },
  },
  {
    name: "기본",
    description: "균형 잡힌 가독성. 일반적인 노트 작성에 적합",
    settings: { ...DEFAULT_SETTINGS },
  },
  {
    name: "여유로운",
    description: "넓은 간격, 큰 폰트. 편안한 읽기에 최적",
    settings: {
      fontSize: 17,
      lineHeight: 2.0,
      paragraphSpacing: 0.8,
      fontFamily: "system",
      headingScale: 1.4,
      codeFontSize: 14,
      codeLineHeight: 1.8,
      codePadding: 16,
      editorPaddingX: 64,
      editorPaddingY: 48,
      letterSpacing: 0.2,
      editorMaxWidth: 720,
      widthMode: "fixed" as const,
      pageAlign: "center" as const,
    },
  },
];

export type ThemeMode = "light" | "newspaper" | "charcoal" | "dark";
export type AccentColor = "blue" | "navy" | "emerald" | "orange" | "red" | "yellow" | "purple";

export interface ThemeColors {
  accent: string;
  accentHover: string;
  accentSubtle: string;
}

export const ACCENT_OPTIONS: { value: AccentColor; label: string; color: string }[] = [
  { value: "red", label: "레드", color: "#dc2626" },
  { value: "orange", label: "오렌지", color: "#ea580c" },
  { value: "yellow", label: "옐로우", color: "#ca8a04" },
  { value: "emerald", label: "에메랄드", color: "#0d9488" },
  { value: "blue", label: "블루", color: "#4a90d9" },
  { value: "navy", label: "네이비", color: "#3b6baa" },
  { value: "purple", label: "퍼플", color: "#7c3aed" },
];

export function getAccentColors(accent: AccentColor, isDark = false): ThemeColors {
  if (isDark) {
    switch (accent) {
      case "red": return { accent: "#f87171", accentHover: "#fca5a5", accentSubtle: "rgba(248, 113, 113, 0.15)" };
      case "orange": return { accent: "#fb923c", accentHover: "#fdba74", accentSubtle: "rgba(251, 146, 60, 0.15)" };
      case "yellow": return { accent: "#facc15", accentHover: "#fde047", accentSubtle: "rgba(250, 204, 21, 0.15)" };
      case "emerald": return { accent: "#2dd4bf", accentHover: "#5eead4", accentSubtle: "rgba(45, 212, 191, 0.15)" };
      case "navy": return { accent: "#7baed6", accentHover: "#a0c8e8", accentSubtle: "rgba(123, 174, 214, 0.15)" };
      case "purple": return { accent: "#a78bfa", accentHover: "#c4b5fd", accentSubtle: "rgba(167, 139, 250, 0.15)" };
      default: return { accent: "#7ab3e8", accentHover: "#a0c9f0", accentSubtle: "rgba(122, 179, 232, 0.15)" };
    }
  }
  switch (accent) {
    case "red": return { accent: "#dc2626", accentHover: "#b91c1c", accentSubtle: "rgba(220, 38, 38, 0.1)" };
    case "orange": return { accent: "#ea580c", accentHover: "#c2410c", accentSubtle: "rgba(234, 88, 12, 0.1)" };
    case "yellow": return { accent: "#ca8a04", accentHover: "#a16207", accentSubtle: "rgba(202, 138, 4, 0.1)" };
    case "emerald": return { accent: "#0d9488", accentHover: "#0f766e", accentSubtle: "rgba(13, 148, 136, 0.1)" };
    case "navy": return { accent: "#3b6baa", accentHover: "#2e5690", accentSubtle: "rgba(59, 107, 170, 0.1)" };
    case "purple": return { accent: "#7c3aed", accentHover: "#6d28d9", accentSubtle: "rgba(124, 58, 237, 0.1)" };
    default: return { accent: "#4a90d9", accentHover: "#3a7bc8", accentSubtle: "rgba(74, 144, 217, 0.12)" };
  }
}

export const FONT_OPTIONS = [
  { value: "system", label: "시스템 기본" },
  { value: "inter", label: "Inter" },
  { value: "noto-sans-kr", label: "Noto Sans KR" },
  { value: "ibm-plex-sans-kr", label: "IBM Plex Sans KR" },
  { value: "gowun-dodum", label: "고운돋움" },
  { value: "nanum-gothic", label: "나눔고딕" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Monospace" },
];

export const CODE_FONT_OPTIONS = [
  { value: "cascadia", label: "Cascadia Code" },
  { value: "fira-code", label: "Fira Code" },
  { value: "jetbrains-mono", label: "JetBrains Mono" },
  { value: "consolas", label: "Consolas" },
  { value: "d2coding", label: "D2Coding" },
  { value: "nanum-gothic-coding", label: "나눔고딕코딩" },
  { value: "source-code-pro", label: "Source Code Pro" },
];

export type SaveMode = "manual" | "on-tab-close" | "1min" | "3min" | "realtime";

export const SAVE_MODE_OPTIONS: { value: SaveMode; label: string; desc: string }[] = [
  { value: "manual", label: "수동 저장", desc: "Ctrl+S로 직접 저장" },
  { value: "on-tab-close", label: "탭 닫을 때", desc: "탭 닫을 때 자동 저장" },
  { value: "1min", label: "1분마다", desc: "1분 간격으로 자동 저장" },
  { value: "3min", label: "3분마다", desc: "3분 간격으로 자동 저장" },
  { value: "realtime", label: "실시간", desc: "편집할 때마다 즉시 저장" },
];

export type SpacingStyleName = "compact" | "default" | "general";

export interface SpacingStyle {
  h1Mt: string; h1Mb: string;
  h2Mt: string; h2Mb: string;
  h3Mt: string; h3Mb: string;
  h4Mt: string; h4Mb: string;
  p: string; li: string;
  pre: string; bq: string; hr: string;
}

export const SPACING_STYLES: Record<SpacingStyleName, { label: string; values: SpacingStyle }> = {
  compact: {
    label: "컴팩트",
    values: {
      h1Mt: "0.75rem", h1Mb: "0.25rem",
      h2Mt: "0.75rem", h2Mb: "0.25rem",
      h3Mt: "0.5rem", h3Mb: "0.25rem",
      h4Mt: "0.5rem", h4Mb: "0.15rem",
      p: "0rem", li: "0rem",
      pre: "0.25rem", bq: "0.25rem", hr: "0.5rem",
    },
  },
  default: {
    label: "기본",
    values: {
      h1Mt: "1rem", h1Mb: "0.5rem",
      h2Mt: "1rem", h2Mb: "0.5rem",
      h3Mt: "1rem", h3Mb: "0.5rem",
      h4Mt: "1rem", h4Mb: "0.25rem",
      p: "0rem", li: "0rem",
      pre: "0.5rem", bq: "0.5rem", hr: "1rem",
    },
  },
  general: {
    label: "여유로운",
    values: {
      h1Mt: "1.5rem", h1Mb: "0.75rem",
      h2Mt: "1.25rem", h2Mb: "0.5rem",
      h3Mt: "1rem", h3Mb: "0.5rem",
      h4Mt: "0.75rem", h4Mb: "0.5rem",
      p: "0.5rem", li: "0.2rem",
      pre: "0.75rem", bq: "0.75rem", hr: "1.5rem",
    },
  },
};

export interface SavedPreset {
  name: string;
  settings: EditorSettings;
  builtIn?: boolean;
}

interface SettingsState {
  settings: EditorSettings;
  showSettings: boolean;
  showStylePanel: boolean;
  themeMode: ThemeMode;
  accentColor: AccentColor;
  tabSize: 2 | 4;
  spacingStyle: SpacingStyleName;
  codeFontFamily: string;
  saveMode: SaveMode;
  savedPresets: SavedPreset[];
  updateSetting: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
  applyPreset: (preset: EditorSettings) => void;
  resetToDefault: () => void;
  setShowSettings: (show: boolean) => void;
  setShowStylePanel: (show: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  setTabSize: (size: 2 | 4) => void;
  setSpacingStyle: (name: SpacingStyleName) => void;
  setCodeFontFamily: (font: string) => void;
  setSaveMode: (mode: SaveMode) => void;
  addSavedPreset: (preset: SavedPreset) => void;
  removeSavedPreset: (name: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_SETTINGS },
      showSettings: false,
      showStylePanel: false,
      themeMode: "newspaper" as ThemeMode,
      accentColor: "navy" as AccentColor,
      tabSize: 2 as 2 | 4,
      spacingStyle: "default" as SpacingStyleName,
      codeFontFamily: "cascadia",
      saveMode: "manual" as SaveMode,
      savedPresets: PRESETS.map((p) => ({ name: p.name, settings: p.settings, builtIn: true })) as SavedPreset[],

      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),

      applyPreset: (preset) =>
        set((state) => ({ settings: { ...preset, fontFamily: state.settings.fontFamily } })),

      resetToDefault: () =>
        set({ settings: { ...DEFAULT_SETTINGS } }),

      setShowSettings: (show) =>
        set({ showSettings: show }),
      setShowStylePanel: (show) =>
        set({ showStylePanel: show }),

      setThemeMode: (mode) => set({ themeMode: mode }),
      setAccentColor: (color) => set({ accentColor: color }),
      setTabSize: (size) => set({ tabSize: size }),
      setSpacingStyle: (name) => set({ spacingStyle: name }),
      setCodeFontFamily: (font) => set({ codeFontFamily: font }),
      setSaveMode: (mode) => set({ saveMode: mode }),
      addSavedPreset: (preset) => set((state) => ({
        savedPresets: [...state.savedPresets.filter((p) => p.name !== preset.name), preset],
      })),
      removeSavedPreset: (name) => set((state) => ({
        savedPresets: state.savedPresets.filter((p) => p.name !== name),
      })),
    }),
    {
      name: "marknote-settings",
      partialize: (state) => ({
        settings: state.settings,
        themeMode: state.themeMode,
        accentColor: state.accentColor,
        tabSize: state.tabSize,
        spacingStyle: state.spacingStyle,
        codeFontFamily: state.codeFontFamily,
        saveMode: state.saveMode,
        savedPresets: state.savedPresets,
      }),
    }
  )
);

export function useAccent(): ThemeColors {
  const accentColor = useSettingsStore((s) => s.accentColor);
  return getAccentColors(accentColor);
}

const FONT_FAMILIES: Record<string, string> = {
  "inter": '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "noto-sans-kr": '"Noto Sans KR", -apple-system, BlinkMacSystemFont, sans-serif',
  "noto-serif-kr": '"Noto Serif KR", -apple-system, BlinkMacSystemFont, serif',
  "ibm-plex-sans-kr": '"IBM Plex Sans KR", -apple-system, BlinkMacSystemFont, sans-serif',
  "gowun-dodum": '"Gowun Dodum", -apple-system, BlinkMacSystemFont, sans-serif',
  "gowun-batang": '"Gowun Batang", -apple-system, BlinkMacSystemFont, serif',
  "nanum-gothic": '"Nanum Gothic", -apple-system, BlinkMacSystemFont, sans-serif',
  "nanum-myeongjo": '"Nanum Myeongjo", -apple-system, BlinkMacSystemFont, serif',
  "roboto": '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "open-sans": '"Open Sans", -apple-system, BlinkMacSystemFont, sans-serif',
  "lora": '"Lora", Georgia, serif',
  "merriweather": '"Merriweather", Georgia, serif',
  "jetbrains-mono": '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  "noto-sans-jp": '"Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif',
  "noto-serif-jp": '"Noto Serif JP", -apple-system, BlinkMacSystemFont, serif',
  "zen-kaku-gothic": '"Zen Kaku Gothic New", -apple-system, BlinkMacSystemFont, sans-serif',
  "zen-old-mincho": '"Zen Old Mincho", -apple-system, BlinkMacSystemFont, serif',
  "noto-sans-sc": '"Noto Sans SC", -apple-system, BlinkMacSystemFont, sans-serif',
  "noto-serif-sc": '"Noto Serif SC", -apple-system, BlinkMacSystemFont, serif',
  "noto-sans-tc": '"Noto Sans TC", -apple-system, BlinkMacSystemFont, sans-serif',
  "noto-serif-tc": '"Noto Serif TC", -apple-system, BlinkMacSystemFont, serif',
  "serif": '"Georgia", "Noto Serif KR", "Times New Roman", serif',
  "mono": '"Cascadia Code", "Fira Code", "Consolas", monospace',
};

const DEFAULT_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export function getFontFamily(value: string): string {
  return FONT_FAMILIES[value] ?? DEFAULT_FONT;
}

const CODE_FONT_FAMILIES: Record<string, string> = {
  "cascadia": '"Cascadia Code", "Fira Code", "Consolas", monospace',
  "fira-code": '"Fira Code", "Cascadia Code", "Consolas", monospace',
  "jetbrains-mono": '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  "consolas": '"Consolas", "Cascadia Code", monospace',
  "d2coding": '"D2Coding", "Nanum Gothic Coding", "Consolas", monospace',
  "nanum-gothic-coding": '"Nanum Gothic Coding", "D2Coding", "Consolas", monospace',
  "source-code-pro": '"Source Code Pro", "Fira Code", "Consolas", monospace',
};

export function getCodeFontFamily(value: string): string {
  return CODE_FONT_FAMILIES[value] ?? CODE_FONT_FAMILIES["cascadia"];
}
