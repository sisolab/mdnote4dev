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

export const FONT_OPTIONS = [
  { value: "system", label: "시스템 기본" },
  { value: "serif", label: "Serif (명조)" },
  { value: "mono", label: "Monospace (고정폭)" },
  { value: "pretendard", label: "Pretendard" },
];

interface SettingsState {
  settings: EditorSettings;
  showSettings: boolean;
  updateSetting: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
  applyPreset: (preset: EditorSettings) => void;
  resetToDefault: () => void;
  setShowSettings: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { ...DEFAULT_SETTINGS },
  showSettings: false,

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
}));

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
