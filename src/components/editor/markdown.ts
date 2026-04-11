import TurndownService from "turndown";
import { convertFileSrc } from "@tauri-apps/api/core";

// ── Turndown 설정 ──────────────────────────────────────────

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "**",
  hr: "---",
});

// 파일 첨부
turndown.addRule("fileAttachment", {
  filter: (node) => node.nodeName === "FILE-ATTACHMENT",
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const filename = el.getAttribute("filename") || "file";
    const relativePath = el.getAttribute("relativepath") || "";
    return `\n\n[${filename}](${relativePath})\n\n`;
  },
});

// 코드블록 (언어 태그 보존)
turndown.addRule("codeBlock", {
  filter: (node) => node.nodeName === "PRE" && !!node.querySelector("code"),
  replacement: (_content, node) => {
    const code = (node as HTMLElement).querySelector("code");
    if (!code) return _content;
    const lang = code.className?.match(/language-(\S+)/)?.[1]
      || (node as HTMLElement).getAttribute("data-language")
      || code.getAttribute("data-language")
      || "";
    const text = code.textContent ?? "";
    return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
  },
});

// 체크박스
turndown.addRule("taskList", {
  filter: (node) => node.nodeName === "UL" && node.getAttribute("data-type") === "taskList",
  replacement: (content) => content,
});
turndown.addRule("taskListItem", {
  filter: (node) => node.nodeName === "LI" && node.getAttribute("data-type") === "taskItem",
  replacement: (content, node) => {
    const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
    return `- ${checked ? "[x]" : "[ ]"} ${content.trim()}\n`;
  },
});

// 이미지: asset URL → 상대경로 복원, HTML img 태그로 저장
turndown.addRule("image", {
  filter: "img",
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    let src = el.getAttribute("src") || "";
    const alt = el.getAttribute("alt") || "";
    const width = el.getAttribute("data-width");
    const align = el.getAttribute("data-align") || "left";
    const assetsMatch = src.match(/\.assets(?:[/\\]|%5C|%2F)(.+?)(?:\?.*)?$/i);
    if (assetsMatch) src = `./.assets/${decodeURIComponent(assetsMatch[1])}`;
    const widthAttr = width && parseInt(width) > 0 ? ` width="${width}"` : "";
    return `<img src="${src}" alt="${alt}"${widthAttr} align="${align}">`;
  },
});

// 테이블: DOM에서 직접 마크다운 생성
turndown.addRule("table", {
  filter: "table",
  replacement: (_content, node) => {
    const rows = (node as HTMLElement).querySelectorAll("tr");
    if (rows.length === 0) return "";
    const lines: string[] = [];
    rows.forEach((row, i) => {
      const cells = row.querySelectorAll("th, td");
      lines.push("| " + Array.from(cells).map((c) => c.textContent?.trim() || " ").join(" | ") + " |");
      if (i === 0) lines.push("| " + Array.from(cells).map(() => "---").join(" | ") + " |");
    });
    return "\n" + lines.join("\n") + "\n";
  },
});
turndown.addRule("tableCell", { filter: ["th", "td"], replacement: (content) => content });
turndown.addRule("tableRow", { filter: "tr", replacement: (content) => content });
turndown.addRule("tableSection", { filter: ["thead", "tbody", "tfoot"], replacement: (content) => content });
turndown.addRule("tableExtra", { filter: ["colgroup", "col"], replacement: () => "" });

// ── HTML → Markdown ────────────────────────────────────────

export function htmlToMarkdown(html: string): string {
  // <file-attachment> → placeholder로 치환 (Turndown이 이스케이프하지 않도록)
  // <file-attachment> 추출 후 Turndown 이후에 삽입
  const attachments: { filename: string; relativePath: string }[] = [];
  html = html.replace(/<file-attachment\s+([^>]*)><\/file-attachment>/gi, (_m, attrs) => {
    const filename = attrs.match(/filename="([^"]*)"/)?.[1] || "file";
    const relativePath = attrs.match(/relativepath="([^"]*)"/)?.[1] || "";
    const idx = attachments.length;
    attachments.push({ filename, relativePath });
    return `<p>FILEATTACH${idx}FILEATTACH</p>`;
  });
  let md = turndown.turndown(html);
  attachments.forEach((a, i) => {
    md = md.replace(new RegExp(`FILEATTACH${i}FILEATTACH`, "g"), `[${a.filename}](${a.relativePath})`);
  });
  return md;
}

// ── Markdown → HTML ────────────────────────────────────────

const SEPARATOR_RE = /^\|\s*[-:]+\s*(\|\s*[-:]+\s*)*\|$/;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 코드블록을 줄 단위로 파싱하여 placeholder로 치환 (regex보다 정확) */
function extractCodeBlocks(text: string): { text: string; blocks: string[] } {
  const blocks: string[] = [];
  const lines = text.split(/\r?\n/);
  const result: string[] = [];
  let inCode = false;
  let codeLang = "";
  let codeLines: string[] = [];

  for (const line of lines) {
    if (!inCode && /^```([a-z0-9+#-]*)[ \t]*$/.test(line)) {
      inCode = true;
      codeLang = (line.match(/^```([a-z0-9+#-]*)/) ?? ["", ""])[1];
      codeLines = [];
    } else if (inCode && /^```[ \t]*$/.test(line)) {
      inCode = false;
      const html = `<pre><code${codeLang ? ` class="language-${codeLang}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`;
      blocks.push(html);
      result.push(`%%CODEBLOCK${blocks.length - 1}%%`);
    } else if (inCode) {
      codeLines.push(line);
    } else {
      result.push(line);
    }
  }

  // 닫히지 않은 코드블록: 원본 복원
  if (inCode) {
    result.push("```" + codeLang);
    result.push(...codeLines);
  }

  return { text: result.join("\n"), blocks };
}

/** HTML 태그를 placeholder로 보호 (마크다운 regex에 의해 깨지지 않도록) */
function protectHtmlBlocks(html: string): { html: string; blocks: string[] } {
  const blocks: string[] = [];
  html = html.replace(/<(img|div|span|table|iframe)\s[^>]*\/?>/gi, (match) => {
    blocks.push(match);
    return `%%HTML_BLOCK_${blocks.length - 1}%%`;
  });
  return { html, blocks };
}

/** placeholder를 원본 HTML로 복원 */
function restoreHtmlBlocks(html: string, blocks: string[]): string {
  return html.replace(/%%HTML_BLOCK_(\d+)%%/g, (_m, idx) => blocks[parseInt(idx)]);
}

/** 상대 이미지 경로를 asset URL로 변환 */
function resolveImagePaths(html: string, docFilePath: string): string {
  return html.replace(/<img\s([^>]*?)src="(\.\/[^"]+)"([^>]*)>/g, (_m) => {
    const src = (_m.match(/src="([^"]+)"/) ?? ["", ""])[1];
    const docDir = docFilePath.substring(0, docFilePath.lastIndexOf("\\"));
    const absPath = `${docDir}\\${src.substring(2).replace(/\//g, "\\")}`;
    const resolvedSrc = convertFileSrc(absPath);
    const widthMatch = _m.match(/width="(\d+)"/);
    const width = widthMatch ? parseInt(widthMatch[1]) : null;
    const align = (_m.match(/align="(\w+)"/) ?? ["", "left"])[1];
    const alt = (_m.match(/alt="([^"]*)"/) ?? ["", ""])[1];
    const style = width && width > 0 ? `width: ${width}px; height: auto; cursor: pointer;` : "cursor: pointer;";
    const alignClass = align === "center" ? "image-center" : "";
    const dataWidth = width !== null ? ` data-width="${width}"` : "";
    return `<img src="${resolvedSrc}" alt="${alt}"${dataWidth} data-align="${align}" class="${alignClass}" style="${style}">`;
  });
}

export function markdownToHtml(md: string, docFilePath?: string | null): string {
  let html = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");

  // 코드 블록을 먼저 추출 (줄 단위 파서로 정확하게 처리)
  const { text: codeExtracted, blocks: codeBlocks } = extractCodeBlocks(html);
  html = codeExtracted;

  // HTML 태그 보호
  const { html: protected_, blocks } = protectHtmlBlocks(html);
  html = protected_;
  // 인라인 코드
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 헤더
  for (let i = 6; i >= 1; i--) {
    html = html.replace(new RegExp(`^${"#".repeat(i)}\\s+(.+)$`, "gm"), `<h${i}>$1</h${i}>`);
  }

  // 수평선
  html = html.replace(/^---$/gm, "<hr>");
  // 인용문
  html = html.replace(/^>\s+(.+)$/gm, "<blockquote><p>$1</p></blockquote>");

  // 체크박스 리스트
  html = html.replace(/^[ \t]*- \[x\]\s*(.*)$/gm,
    '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span>$1</span></label></li></ul>');
  html = html.replace(/^[ \t]*- \[ ?\]\s*(.*)$/gm,
    '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span>$1</span></label></li></ul>');
  // 일반 리스트 (들여쓰기 포함)
  html = html.replace(/^[ \t]*- (.+)$/gm, "<ul><li>$1</li></ul>");
  // 번호 리스트
  html = html.replace(/^[ \t]*\d+\.\s+(.+)$/gm, "<ol><li>$1</li></ol>");

  // 테이블
  html = html.replace(/(^\|.*\|[ \t]*$\n?)+/gm, (match) => {
    const rows = match.trim().split(/\r?\n/).filter(Boolean);
    if (rows.length < 2 || !rows.some((r) => SEPARATOR_RE.test(r.trim()))) return match;
    const tableRows = rows
      .filter((row) => !SEPARATOR_RE.test(row.trim()))
      .map((row, i) => {
        const cells = row.split("|").slice(1, -1)
          .map((c) => `<${i === 0 ? "th" : "td"}>${c.trim() || " "}</${i === 0 ? "th" : "td"}>`)
          .join("");
        return `<tr>${cells}</tr>`;
      }).join("");
    return `<table><tbody>${tableRows}</tbody></table>`;
  });

  // 인라인 서식
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/~~(.+?)~~/g, "<s>$1</s>");

  // 이미지 (표준 마크다운 형식)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
    let resolvedSrc = src;
    if (docFilePath && src.startsWith("./")) {
      const docDir = docFilePath.substring(0, docFilePath.lastIndexOf("\\"));
      resolvedSrc = convertFileSrc(`${docDir}\\${src.substring(2).replace(/\//g, "\\")}`);
    }
    return `<img src="${resolvedSrc}" alt="${alt}">`;
  });

  // 파일 첨부 (.assets/ 링크 중 이미지가 아닌 것)
  html = html.replace(/\[([^\]]+)\]\((\.\/\.assets\/[^)]+)\)/g, (_m, name, path) => {
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(path)) return _m; // 이미지는 스킵
    const filename = path.split("/").pop() ?? name;
    let filepath = path;
    if (docFilePath && path.startsWith("./")) {
      const docDir = docFilePath.substring(0, docFilePath.lastIndexOf("\\"));
      filepath = `${docDir}\\${path.substring(2).replace(/\//g, "\\")}`;
    }
    return `<file-attachment filename="${filename}" filepath="${filepath}" relativepath="${path}"></file-attachment>`;
  });

  // 링크
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 문단
  html = html.split("\n\n").map((block) => {
    block = block.trim();
    if (!block) return "";
    if (block.startsWith("<") || block.startsWith("%%HTML_BLOCK_") || block.startsWith("%%CODEBLOCK")) return block;
    return `<p>${block.replace(/\n/g, "<br>")}</p>`;
  }).join("");

  // 코드블록 복원
  codeBlocks.forEach((cb, i) => {
    html = html.replace(`%%CODEBLOCK${i}%%`, cb);
    html = html.replace(`<p>%%CODEBLOCK${i}%%</p>`, cb);
  });

  // HTML 복원 + 이미지 경로 변환
  html = restoreHtmlBlocks(html, blocks);
  if (docFilePath) html = resolveImagePaths(html, docFilePath);

  return html;
}
