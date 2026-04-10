import { create } from "zustand";

export interface EditorSettings {
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  fontFamily: string;
  editorMaxWidth: number;
  headingScale: number;
  codeFontSize: number;
  codeLineHeight: number;
  editorPaddingX: number;
  editorPaddingY: number;
  letterSpacing: number;
  widthMode: "fixed" | "fluid";
}

export interface Preset {
  name: string;
  description: string;
  settings: EditorSettings;
}

const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 15,
  lineHeight: 1.75,
  paragraphSpacing: 0.5,
  fontFamily: "system",
  editorMaxWidth: 780,
  headingScale: 1.3,
  codeFontSize: 13,
  codeLineHeight: 1.6,
  editorPaddingX: 24,
  editorPaddingY: 24,
  letterSpacing: 0,
  widthMode: "fluid" as const,
};

export const PRESETS: Preset[] = [
  {
    name: "컴팩트",
    description: "좁은 간격, 작은 폰트. 정보를 빽빽하게 볼 때",
    settings: {
      fontSize: 13,
      lineHeight: 1.5,
      paragraphSpacing: 0.3,
      fontFamily: "system",
      editorMaxWidth: 700,
      headingScale: 1.2,
      codeFontSize: 12,
      codeLineHeight: 1.4,
      editorPaddingX: 32,
      editorPaddingY: 24,
      letterSpacing: 0,
      widthMode: "fluid" as const,
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
      paragraphSpacing: 0.75,
      fontFamily: "serif",
      editorMaxWidth: 860,
      headingScale: 1.4,
      codeFontSize: 14,
      codeLineHeight: 1.8,
      editorPaddingX: 64,
      editorPaddingY: 48,
      letterSpacing: 0.2,
      widthMode: "fluid" as const,
    },
  },
];

export type ThemeMode = "light" | "warm" | "charcoal" | "dark";
export type AccentColor = "blue" | "emerald" | "orange" | "yellow" | "purple";

export interface ThemeColors {
  accent: string;
  accentHover: string;
  accentSubtle: string;
}

export const ACCENT_OPTIONS: { value: AccentColor; label: string; color: string }[] = [
  { value: "blue", label: "블루", color: "#1a73e8" },
  { value: "emerald", label: "에메랄드", color: "#0d9488" },
  { value: "orange", label: "오렌지", color: "#ea580c" },
  { value: "yellow", label: "옐로우", color: "#ca8a04" },
  { value: "purple", label: "퍼플", color: "#7c3aed" },
];

export function getAccentColors(accent: AccentColor, isDark = false): ThemeColors {
  if (isDark) {
    switch (accent) {
      case "emerald": return { accent: "#2dd4bf", accentHover: "#5eead4", accentSubtle: "rgba(45, 212, 191, 0.15)" };
      case "orange": return { accent: "#fb923c", accentHover: "#fdba74", accentSubtle: "rgba(251, 146, 60, 0.15)" };
      case "yellow": return { accent: "#facc15", accentHover: "#fde047", accentSubtle: "rgba(250, 204, 21, 0.15)" };
      case "purple": return { accent: "#a78bfa", accentHover: "#c4b5fd", accentSubtle: "rgba(167, 139, 250, 0.15)" };
      default: return { accent: "#60a5fa", accentHover: "#93c5fd", accentSubtle: "rgba(96, 165, 250, 0.15)" };
    }
  }
  switch (accent) {
    case "emerald": return { accent: "#0d9488", accentHover: "#0f766e", accentSubtle: "rgba(13, 148, 136, 0.1)" };
    case "orange": return { accent: "#ea580c", accentHover: "#c2410c", accentSubtle: "rgba(234, 88, 12, 0.1)" };
    case "yellow": return { accent: "#ca8a04", accentHover: "#a16207", accentSubtle: "rgba(202, 138, 4, 0.1)" };
    case "purple": return { accent: "#7c3aed", accentHover: "#6d28d9", accentSubtle: "rgba(124, 58, 237, 0.1)" };
    default: return { accent: "#1a73e8", accentHover: "#1557b0", accentSubtle: "rgba(26, 115, 232, 0.12)" };
  }
}

export const FONT_OPTIONS = [
  { value: "system", label: "시스템 기본" },
  { value: "serif", label: "Serif (명조)" },
  { value: "mono", label: "Monospace (고정폭)" },
  { value: "pretendard", label: "Pretendard" },
];

interface SettingsState {
  settings: EditorSettings;
  showSettings: boolean;
  themeMode: ThemeMode;
  accentColor: AccentColor;
  updateSetting: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
  applyPreset: (preset: EditorSettings) => void;
  resetToDefault: () => void;
  setShowSettings: (show: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { ...DEFAULT_SETTINGS },
  showSettings: false,
  themeMode: "light",
  accentColor: "blue",

  updateSetting: (key, value) =>
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    })),

  applyPreset: (preset) =>
    set({ settings: { ...preset } }),

  resetToDefault: () =>
    set({ settings: { ...DEFAULT_SETTINGS } }),

  setShowSettings: (show) =>
    set({ showSettings: show }),

  setThemeMode: (mode) => set({ themeMode: mode }),
  setAccentColor: (color) => set({ accentColor: color }),
}));

export function useAccent(): ThemeColors {
  const accentColor = useSettingsStore((s) => s.accentColor);
  return getAccentColors(accentColor);
}

export function getFontFamily(value: string): string {
  switch (value) {
    case "serif":
      return '"Georgia", "Noto Serif KR", "Times New Roman", serif';
    case "mono":
      return '"Cascadia Code", "Fira Code", "Consolas", monospace';
    case "pretendard":
      return '"Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    default:
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  }
}
