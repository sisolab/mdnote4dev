import { useState, useEffect, useRef, useCallback } from "react";
import { RotateCcw } from "lucide-react";

interface FontItem {
  value: string;
  label: string;
  family: string;
  type: "sans" | "serif" | "mono";
}

interface FontCategory {
  id: string;
  label: string;
  fonts: FontItem[];
  sample: string;
}

const CATEGORIES: FontCategory[] = [
  {
    id: "popular",
    label: "Popular",
    fonts: [
      { value: "inter", label: "Inter", family: "Inter", type: "sans" },
      { value: "roboto", label: "Roboto", family: "Roboto", type: "sans" },
      { value: "merriweather", label: "Merriweather", family: "Merriweather", type: "serif" },
      { value: "jetbrains-mono", label: "JetBrains Mono", family: "JetBrains Mono", type: "mono" },
    ],
    sample: `# The Quick Brown Fox\n## Typography Preview\nThe quick brown fox jumps over the lazy dog. **Bold text** and *italic text* work together.\n\n- Bullet point one\n- Bullet point two\n\n> A well-chosen typeface can elevate your content.\n\n\`inline code\` and block:\n\`\`\`\nconst hello = "world";\n\`\`\``,
  },
  {
    id: "en",
    label: "English",
    fonts: [
      { value: "inter", label: "Inter", family: "Inter", type: "sans" },
      { value: "roboto", label: "Roboto", family: "Roboto", type: "sans" },
      { value: "open-sans", label: "Open Sans", family: "Open Sans", type: "sans" },
      { value: "lora", label: "Lora", family: "Lora", type: "serif" },
      { value: "merriweather", label: "Merriweather", family: "Merriweather", type: "serif" },
      { value: "jetbrains-mono", label: "JetBrains Mono", family: "JetBrains Mono", type: "mono" },
    ],
    sample: `# Beautiful Typography\n## Clean and Readable\nEvery great document starts with a great typeface. **Bold statements** need *elegant delivery*.\n\n- First item in the list\n- Second item here\n\n> Typography is the craft of endowing human language with a durable visual form.\n\n\`console.log("hello")\` and:\n\`\`\`\nfunction greet(name) {\n  return "Hello, " + name;\n}\n\`\`\``,
  },
  {
    id: "ko",
    label: "한국어",
    fonts: [
      { value: "noto-sans-kr", label: "Noto Sans KR", family: "Noto Sans KR", type: "sans" },
      { value: "noto-serif-kr", label: "Noto Serif KR", family: "Noto Serif KR", type: "serif" },
      { value: "ibm-plex-sans-kr", label: "IBM Plex Sans KR", family: "IBM Plex Sans KR", type: "sans" },
      { value: "nanum-gothic", label: "나눔고딕", family: "Nanum Gothic", type: "sans" },
      { value: "nanum-myeongjo", label: "나눔명조", family: "Nanum Myeongjo", type: "serif" },
      { value: "gowun-dodum", label: "고운돋움", family: "Gowun Dodum", type: "sans" },
      { value: "gowun-batang", label: "고운바탕", family: "Gowun Batang", type: "serif" },
    ],
    sample: `# 아름다운 타이포그래피\n## 깔끔하고 읽기 좋은 서체\n좋은 문서는 좋은 서체에서 시작됩니다. **강조된 문장**과 *기울임 텍스트*를 함께 사용합니다.\n\n- 첫 번째 항목\n- 두 번째 항목\n\n> 타이포그래피는 인간의 언어에 시각적 형태를 부여하는 기술입니다.\n\n\`인라인 코드\` 예시:\n\`\`\`\nconst 인사 = "안녕하세요!";\nconsole.log(인사);\n\`\`\``,
  },
  {
    id: "ja",
    label: "日本語",
    fonts: [
      { value: "noto-sans-jp", label: "Noto Sans JP", family: "Noto Sans JP", type: "sans" },
      { value: "noto-serif-jp", label: "Noto Serif JP", family: "Noto Serif JP", type: "serif" },
      { value: "zen-kaku-gothic", label: "Zen Kaku Gothic", family: "Zen Kaku Gothic New", type: "sans" },
      { value: "zen-old-mincho", label: "Zen Old Mincho", family: "Zen Old Mincho", type: "serif" },
    ],
    sample: `# 美しいタイポグラフィ\n## 読みやすいフォント\n素晴らしい文書は、優れた書体から始まります。**太字テキスト**と*斜体テキスト*。\n\n- 最初の項目\n- 二番目の項目\n\n> タイポグラフィとは、人間の言語に永続的な視覚的形式を与える技術です。\n\n\`インラインコード\` の例:\n\`\`\`\nconst greeting = "こんにちは！";\n\`\`\``,
  },
  {
    id: "es",
    label: "Español",
    fonts: [
      { value: "inter", label: "Inter", family: "Inter", type: "sans" },
      { value: "roboto", label: "Roboto", family: "Roboto", type: "sans" },
      { value: "lora", label: "Lora", family: "Lora", type: "serif" },
      { value: "merriweather", label: "Merriweather", family: "Merriweather", type: "serif" },
    ],
    sample: `# Tipografía Hermosa\n## Clara y Legible\nUn gran documento comienza con una gran tipografía. **Texto en negrita** y *texto en cursiva* trabajan juntos.\n\n- Primer elemento\n- Segundo elemento\n\n> La tipografía es el arte de dar forma visual al lenguaje humano.\n\n\`código en línea\` y bloque:\n\`\`\`\nconst saludo = "¡Hola!";\n\`\`\``,
  },
  {
    id: "fr",
    label: "Français",
    fonts: [
      { value: "inter", label: "Inter", family: "Inter", type: "sans" },
      { value: "roboto", label: "Roboto", family: "Roboto", type: "sans" },
      { value: "lora", label: "Lora", family: "Lora", type: "serif" },
      { value: "merriweather", label: "Merriweather", family: "Merriweather", type: "serif" },
    ],
    sample: `# Belle Typographie\n## Claire et Lisible\nUn excellent document commence par une excellente police. **Texte en gras** et *texte en italique* fonctionnent ensemble.\n\n- Premier élément\n- Deuxième élément\n\n> La typographie est l'art de donner une forme visuelle au langage humain.\n\n\`code en ligne\` et bloc :\n\`\`\`\nconst salut = "Bonjour !";\n\`\`\``,
  },
  {
    id: "de",
    label: "Deutsch",
    fonts: [
      { value: "inter", label: "Inter", family: "Inter", type: "sans" },
      { value: "roboto", label: "Roboto", family: "Roboto", type: "sans" },
      { value: "lora", label: "Lora", family: "Lora", type: "serif" },
      { value: "merriweather", label: "Merriweather", family: "Merriweather", type: "serif" },
    ],
    sample: `# Schöne Typografie\n## Klar und Lesbar\nEin großartiges Dokument beginnt mit einer großartigen Schrift. **Fetter Text** und *kursiver Text* arbeiten zusammen.\n\n- Erster Punkt\n- Zweiter Punkt\n\n> Typografie ist die Kunst, menschlicher Sprache eine dauerhafte visuelle Form zu geben.\n\n\`Inline-Code\` und Block:\n\`\`\`\nconst gruß = "Hallo!";\n\`\`\``,
  },
  {
    id: "pt",
    label: "Português",
    fonts: [
      { value: "inter", label: "Inter", family: "Inter", type: "sans" },
      { value: "roboto", label: "Roboto", family: "Roboto", type: "sans" },
      { value: "lora", label: "Lora", family: "Lora", type: "serif" },
      { value: "merriweather", label: "Merriweather", family: "Merriweather", type: "serif" },
    ],
    sample: `# Bela Tipografia\n## Clara e Legível\nUm ótimo documento começa com uma ótima tipografia. **Texto em negrito** e *texto em itálico* trabalham juntos.\n\n- Primeiro item\n- Segundo item\n\n> A tipografia é a arte de dar forma visual à linguagem humana.\n\n\`código inline\` e bloco:\n\`\`\`\nconst saudacao = "Olá!";\n\`\`\``,
  },
  {
    id: "ar",
    label: "العربية",
    fonts: [
      { value: "noto-sans-arabic", label: "Noto Sans Arabic", family: "Noto Sans Arabic", type: "sans" },
      { value: "noto-serif-arabic", label: "Noto Naskh Arabic", family: "Noto Naskh Arabic", type: "serif" },
    ],
    sample: `# طباعة جميلة\n## واضحة وسهلة القراءة\nيبدأ كل مستند رائع بخط رائع. **نص عريض** و*نص مائل* يعملان معًا.\n\n- العنصر الأول\n- العنصر الثاني\n\n> الطباعة هي فن إعطاء اللغة البشرية شكلاً بصرياً دائماً.\n\n\`كود مضمّن\` ومقطع:\n\`\`\`\nconst تحية = "مرحباً!";\n\`\`\``,
  },
  {
    id: "hi",
    label: "हिन्दी",
    fonts: [
      { value: "noto-sans-devanagari", label: "Noto Sans Devanagari", family: "Noto Sans Devanagari", type: "sans" },
      { value: "noto-serif-devanagari", label: "Noto Serif Devanagari", family: "Noto Serif Devanagari", type: "serif" },
    ],
    sample: `# सुंदर टाइपोग्राफी\n## स्पष्ट और पठनीय\nएक अच्छा दस्तावेज़ एक अच्छे फ़ॉन्ट से शुरू होता है। **बोल्ड टेक्स्ट** और *इटैलिक टेक्स्ट* साथ काम करते हैं।\n\n- पहला आइटम\n- दूसरा आइटम\n\n> टाइपोग्राफी मानव भाषा को स्थायी दृश्य रूप देने की कला है।\n\n\`इनलाइन कोड\` और ब्लॉक:\n\`\`\`\nconst नमस्ते = "नमस्ते!";\n\`\`\``,
  },
  {
    id: "zh",
    label: "中文",
    fonts: [
      { value: "noto-sans-sc", label: "Noto Sans SC", family: "Noto Sans SC", type: "sans" },
      { value: "noto-serif-sc", label: "Noto Serif SC", family: "Noto Serif SC", type: "serif" },
      { value: "noto-sans-tc", label: "Noto Sans TC", family: "Noto Sans TC", type: "sans" },
      { value: "noto-serif-tc", label: "Noto Serif TC", family: "Noto Serif TC", type: "serif" },
    ],
    sample: `# 优美的排版\n## 清晰易读的字体\n优秀的文档始于优秀的字体。**粗体文本**和*斜体文本*相得益彰。\n\n- 第一个项目\n- 第二个项目\n\n> 排版是赋予人类语言持久视觉形式的艺术。\n\n\`内联代码\` 示例：\n\`\`\`\nconst greeting = "你好！";\n\`\`\``,
  },
];

function buildFontUrl(families: string[]): string {
  const params = families.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700`).join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

function renderMarkdown(md: string): string {
  let html = md;
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) =>
    `<pre style="background:#1e1e2e;color:#cdd6f4;padding:12px;border-radius:6px;font-family:monospace;font-size:12px;overflow-x:auto;margin:8px 0">${code.replace(/</g, "&lt;").trimEnd()}</pre>`
  );
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--color-bg-hover);padding:1px 4px;border-radius:3px;font-size:0.9em">$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:1.1em;font-weight:600;margin:12px 0 4px">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:1.3em;font-weight:600;margin:12px 0 6px">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:1.6em;font-weight:700;margin:0 0 8px">$1</h1>');
  html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid var(--color-accent);padding-left:12px;color:var(--color-text-secondary);margin:8px 0">$1</blockquote>');
  html = html.replace(/^- (.+)$/gm, '<li style="margin:2px 0;margin-left:16px">$1</li>');
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.split("\n\n").map((b) => {
    b = b.trim();
    if (!b || b.startsWith("<")) return b;
    return `<p style="margin:6px 0">${b}</p>`;
  }).join("");
  return html;
}

export function FontPreview({
  currentFont,
  onApply,
  onClose,
}: {
  currentFont: string;
  onApply: (fontValue: string) => void;
  onClose: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState("popular");
  const [selectedFont, setSelectedFont] = useState<FontItem | null>(null);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());

  // 슬라이딩 하이라이트 — 언어 목록
  const langRef = useRef<HTMLDivElement>(null);
  const [langHighlight, setLangHighlight] = useState<{ top: number; height: number } | null>(null);
  // 슬라이딩 하이라이트 — 폰트 목록
  const fontRef = useRef<HTMLDivElement>(null);
  const [fontHighlight, setFontHighlight] = useState<{ top: number; height: number } | null>(null);

  const handleLangHover = useCallback((el: HTMLElement | null) => {
    if (!el || !langRef.current) { setLangHighlight(null); return; }
    const cr = langRef.current.getBoundingClientRect();
    const br = el.getBoundingClientRect();
    setLangHighlight({ top: br.top - cr.top, height: br.height });
  }, []);

  const handleFontHover = useCallback((el: HTMLElement | null) => {
    if (!el || !fontRef.current) { setFontHighlight(null); return; }
    const cr = fontRef.current.getBoundingClientRect();
    const br = el.getBoundingClientRect();
    setFontHighlight({ top: br.top - cr.top, height: br.height });
  }, []);

  const category = CATEGORIES.find((c) => c.id === selectedCategory)!;

  useEffect(() => {
    const families = category.fonts.map((f) => f.family).filter((f) => !loadedFonts.has(f));
    if (families.length === 0) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = buildFontUrl(families);
    document.head.appendChild(link);
    setLoadedFonts((prev) => { const n = new Set(prev); families.forEach((f) => n.add(f)); return n; });
  }, [selectedCategory, category.fonts, loadedFonts]);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const previewFont = selectedFont ? `"${selectedFont.family}", sans-serif` : "inherit";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.35)", animation: "fadeIn 0.15s ease-out",
        display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "40px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "860px", height: "calc(100vh - 80px)", maxHeight: "620px",
          background: "var(--color-bg-elevated)", borderRadius: "12px",
          border: "1px solid var(--color-border-medium)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--color-border-light)" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-heading)" }}>글꼴 미리보기</span>
        </div>

        {/* 본문 — 3컬럼 */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* 1열: 언어 카테고리 */}
          <div
            ref={langRef}
            onMouseLeave={() => setLangHighlight(null)}
            style={{ width: "160px", borderRight: "1px solid var(--color-border-light)", overflowY: "auto", padding: "8px 0", position: "relative", flexShrink: 0 }}
          >
            {/* 슬라이딩 하이라이트 */}
            <div style={{
              position: "absolute", left: "4px", right: "4px",
              top: langHighlight ? `${langHighlight.top}px` : 0,
              height: langHighlight ? `${langHighlight.height}px` : 0,
              background: "var(--color-bg-hover)", borderRadius: "3px",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              opacity: langHighlight ? 1 : 0, pointerEvents: "none",
            }} />

            {["popular", "en", "zh", "es", "hi", "ar", "pt", "fr", "ja", "de", "ko"].map((id) => CATEGORIES.find((c) => c.id === id)!).map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setSelectedFont(null); }}
                  onMouseEnter={(e) => handleLangHover(e.currentTarget)}
                  style={{
                    display: "flex", alignItems: "center", width: "100%",
                    padding: "10px 16px", fontSize: "13px", fontWeight: isActive ? 600 : 400,
                    border: "none", cursor: "pointer", background: "transparent",
                    color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                    position: "relative", zIndex: 1, transition: "color 0.1s",
                  }}
                >
                  {cat.label}
                  {/* 미니멀 좌측 인디케이터 */}
                  <div style={{
                    position: "absolute", left: "2px", top: "50%", transform: "translateY(-50%)",
                    width: "2px", height: isActive ? "14px" : "0px", borderRadius: "1px",
                    background: "var(--color-accent)",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  }} />
                </button>
              );
            })}
          </div>

          {/* 2열: 폰트 목록 */}
          <div
            ref={fontRef}
            onMouseLeave={() => setFontHighlight(null)}
            style={{ width: "220px", borderRight: "1px solid var(--color-border-light)", overflowY: "auto", padding: "8px 0", position: "relative", flexShrink: 0 }}
          >
            {/* 슬라이딩 하이라이트 */}
            <div style={{
              position: "absolute", left: "4px", right: "4px",
              top: fontHighlight ? `${fontHighlight.top}px` : 0,
              height: fontHighlight ? `${fontHighlight.height}px` : 0,
              background: "var(--color-bg-hover)", borderRadius: "3px",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              opacity: fontHighlight ? 1 : 0, pointerEvents: "none",
            }} />

            {category.fonts.map((font) => {
              const isSelected = selectedFont?.value === font.value;
              const isCurrent = currentFont === font.value;
              return (
                <button
                  key={font.value}
                  onClick={() => setSelectedFont(font)}
                  onMouseEnter={(e) => handleFontHover(e.currentTarget)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "10px 16px",
                    border: "none", cursor: "pointer", background: "transparent",
                    position: "relative", zIndex: 1, transition: "color 0.1s",
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: "13px", fontWeight: 500,
                      fontFamily: `"${font.family}", sans-serif`,
                      color: isSelected ? "var(--color-accent)" : "var(--color-text-primary)",
                      marginBottom: "1px",
                    }}>
                      {font.label}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--color-text-light)" }}>
                      {font.type === "sans" ? "Sans-serif" : font.type === "serif" ? "Serif" : "Monospace"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    {isCurrent && (
                      <span style={{ fontSize: "9px", color: "var(--color-text-muted)", fontWeight: 500, padding: "1px 4px", borderRadius: "3px", background: "var(--color-bg-hover)" }}>현재</span>
                    )}
                  </div>
                  {/* 미니멀 언더라인 */}
                  <div style={{
                    position: "absolute", bottom: "2px", left: "16px",
                    width: isSelected ? "14px" : "0px", height: "2px", borderRadius: "1px",
                    background: "var(--color-accent)",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  }} />
                </button>
              );
            })}
          </div>

          {/* 3열: 미리보기 */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "20px 24px",
            fontFamily: previewFont,
            fontSize: "14px", lineHeight: 1.7,
            color: "var(--color-text-primary)",
          }}>
            {selectedFont ? (
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(category.sample) }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-light)", fontSize: "13px" }}>
                폰트를 선택하면 미리보기가 표시됩니다
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", borderTop: "1px solid var(--color-border-light)",
          background: "var(--color-bg-secondary)",
        }}>
          <button
            onClick={() => { onApply("system"); onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              fontSize: "12px", color: "var(--color-text-tertiary)", background: "transparent",
              border: "none", cursor: "pointer",
            }}
          >
            <RotateCcw size={11} /> 시스템 기본으로
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "6px 16px", fontSize: "12px", fontWeight: 500,
                background: "var(--color-bg-hover)", color: "var(--color-text-primary)",
                border: "none", borderRadius: "6px", cursor: "pointer",
              }}
            >
              취소
            </button>
            <button
              onClick={() => { if (selectedFont) { onApply(selectedFont.value); onClose(); } }}
              disabled={!selectedFont}
              style={{
                padding: "6px 16px", fontSize: "12px", fontWeight: 600,
                background: selectedFont ? "var(--color-accent)" : "var(--color-bg-hover)",
                color: selectedFont ? "#fff" : "var(--color-text-muted)",
                border: "none", borderRadius: "6px", cursor: selectedFont ? "pointer" : "default",
              }}
            >
              적용하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
