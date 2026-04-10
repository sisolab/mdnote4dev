import TurndownService from "turndown";
import { convertFileSrc } from "@tauri-apps/api/core";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "**",
  hr: "---",
});

// 체크박스 변환 규칙
turndown.addRule("taskList", {
  filter: (node) => {
    return node.nodeName === "UL" && node.getAttribute("data-type") === "taskList";
  },
  replacement: (content) => content,
});

turndown.addRule("taskListItem", {
  filter: (node) => {
    return (
      node.nodeName === "LI" &&
      node.getAttribute("data-type") === "taskItem"
    );
  },
  replacement: (content, node) => {
    const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
    const checkbox = checked ? "[x]" : "[ ]";
    return `- ${checkbox} ${content.trim()}\n`;
  },
});

// 이미지 변환 규칙: asset URL → 상대경로 복원, HTML 태그로 저장
turndown.addRule("image", {
  filter: "img",
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    let src = el.getAttribute("src") || "";
    const alt = el.getAttribute("alt") || "";
    const width = el.getAttribute("data-width") || "320";
    const align = el.getAttribute("data-align") || "left";
    // asset:// URL에서 .assets 경로 추출
    const assetsMatch = src.match(/\.assets(?:[/\\]|%5C|%2F)(.+?)(?:\?.*)?$/i);
    if (assetsMatch) {
      src = `./.assets/${decodeURIComponent(assetsMatch[1])}`;
    }
    const widthAttr = parseInt(width) > 0 ? ` width="${width}"` : "";
    return `<img src="${src}" alt="${alt}"${widthAttr} align="${align}">`;
  },
});

// 테이블 변환 규칙
// 테이블: table 노드에서 직접 마크다운 생성
turndown.addRule("table", {
  filter: "table",
  replacement: (_content, node) => {
    const tableEl = node as HTMLElement;
    const rows = tableEl.querySelectorAll("tr");
    if (rows.length === 0) return "";

    const lines: string[] = [];
    rows.forEach((row, i) => {
      const cells = row.querySelectorAll("th, td");
      const line = "| " + Array.from(cells).map((c) => c.textContent?.trim() || " ").join(" | ") + " |";
      lines.push(line);
      if (i === 0) {
        lines.push("| " + Array.from(cells).map(() => "---").join(" | ") + " |");
      }
    });
    return "\n" + lines.join("\n") + "\n";
  },
});

turndown.addRule("tableCell", { filter: ["th", "td"], replacement: (content) => content });
turndown.addRule("tableRow", { filter: "tr", replacement: (content) => content });
turndown.addRule("tableSection", { filter: ["thead", "tbody", "tfoot"], replacement: (content) => content });
turndown.addRule("tableExtra", { filter: ["colgroup", "col"], replacement: () => "" });

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}

export function markdownToHtml(md: string, docFilePath?: string | null): string {
  // frontmatter 제거
  let html = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");

  // HTML 태그 보호 (img 등) — 마크다운 변환에 의해 깨지지 않도록 placeholder로 대체
  const htmlBlocks: string[] = [];
  html = html.replace(/<(img|div|span|table|iframe)\s[^>]*\/?>/gi, (match) => {
    htmlBlocks.push(match);
    return `%%HTML_BLOCK_${htmlBlocks.length - 1}%%`;
  });

  // 코드 블록 (먼저 처리)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre><code class="language-${lang}">${escapeHtml(code.trimEnd())}</code></pre>`;
  });

  // 인라인 코드
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 헤더
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // 수평선
  html = html.replace(/^---$/gm, "<hr>");

  // 인용문
  html = html.replace(/^>\s+(.+)$/gm, "<blockquote><p>$1</p></blockquote>");

  // 체크박스 리스트
  html = html.replace(
    /^- \[x\]\s*(.*)$/gm,
    '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span>$1</span></label></li></ul>'
  );
  html = html.replace(
    /^- \[ ?\]\s*(.*)$/gm,
    '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span>$1</span></label></li></ul>'
  );

  // 일반 리스트
  html = html.replace(/^- (.+)$/gm, "<ul><li>$1</li></ul>");

  // 테이블 (\r\n도 지원)
  // 표: | 로 시작하고 | 로 끝나는 연속된 줄 (구분선 포함)
  html = html.replace(/(^\|.*\|[ \t]*$\n?)+/gm, (match) => {
    const rows = match.trim().split(/\r?\n/).filter(Boolean);
    // 최소 2줄(헤더 + 구분선)이 있어야 표
    if (rows.length < 2) return match;
    // 구분선이 있는지 확인
    const hasSeparator = rows.some((r) => /^\|\s*[-:]+\s*(\|\s*[-:]+\s*)*\|$/.test(r.trim()));
    if (!hasSeparator) return match;
    const tableRows = rows
      .filter((row) => !/^\|\s*[-:]+\s*(\|\s*[-:]+\s*)*\|$/.test(row.trim())) // 구분선 제거
      .map((row, i) => {
        const parts = row.split("|");
        const cells = parts.slice(1, parts.length - 1)
          .map((c) => {
            const tag = i === 0 ? "th" : "td";
            return `<${tag}>${c.trim() || " "}</${tag}>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
    return `<table><tbody>${tableRows}</tbody></table>`;
  });

  // 볼드, 이탤릭, 취소선
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/~~(.+?)~~/g, "<s>$1</s>");

  // 이미지: 표준 마크다운 ![alt](src) → HTML img 변환 (크기/정렬 없음)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
    let resolvedSrc = src;
    if (docFilePath && src.startsWith("./")) {
      const docDir = docFilePath.substring(0, docFilePath.lastIndexOf("\\"));
      const absPath = `${docDir}\\${src.substring(2).replace(/\//g, "\\")}`;
      resolvedSrc = convertFileSrc(absPath);
    }
    return `<img src="${resolvedSrc}" alt="${alt}">`;
  });

  // 링크
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 문단 (빈 줄로 구분)
  html = html
    .split("\n\n")
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (block.startsWith("<") || block.startsWith("%%HTML_BLOCK_")) return block;
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");

  // HTML 태그 placeholder 복원
  html = html.replace(/%%HTML_BLOCK_(\d+)%%/g, (_m, idx) => htmlBlocks[parseInt(idx)]);

  // <img> 태그의 상대경로를 asset URL로 변환
  if (docFilePath) {
    html = html.replace(/<img\s([^>]*?)src="(\.\/[^"]+)"([^>]*)>/g, (_m) => {
      const srcMatch = _m.match(/src="([^"]+)"/);
      const src = srcMatch?.[1] ?? "";
      const docDir = docFilePath.substring(0, docFilePath.lastIndexOf("\\"));
      const absPath = `${docDir}\\${src.substring(2).replace(/\//g, "\\")}`;
      const resolvedSrc = convertFileSrc(absPath);
      const widthMatch = _m.match(/width="(\d+)"/);
      const alignMatch = _m.match(/align="(\w+)"/);
      const width = widthMatch ? parseInt(widthMatch[1]) : 320;
      const align = alignMatch ? alignMatch[1] : "left";
      const alt = (_m.match(/alt="([^"]*)"/) || ["", ""])[1];
      const style = width > 0 ? `width: ${width}px; height: auto; cursor: pointer;` : "cursor: pointer;";
      const alignClass = align === "center" ? "image-center" : "";
      return `<img src="${resolvedSrc}" alt="${alt}" data-width="${width}" data-align="${align}" class="${alignClass}" style="${style}">`;
    });
  }

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
