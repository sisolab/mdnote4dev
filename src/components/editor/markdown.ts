import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "**",
  hr: "---",
});

// 체크박스 변환 규칙
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
    return `${checkbox} ${content.trim()}\n`;
  },
});

// 테이블 변환 규칙
turndown.addRule("tableCell", {
  filter: ["th", "td"],
  replacement: (content) => ` ${content.trim()} |`,
});

turndown.addRule("tableRow", {
  filter: "tr",
  replacement: (content) => `|${content}\n`,
});

turndown.addRule("table", {
  filter: "table",
  replacement: (_content, node) => {
    const rows = (node as HTMLElement).querySelectorAll("tr");
    if (rows.length === 0) return "";

    const lines: string[] = [];
    rows.forEach((row, i) => {
      const cells = row.querySelectorAll("th, td");
      const line =
        "| " +
        Array.from(cells)
          .map((c) => c.textContent?.trim() ?? "")
          .join(" | ") +
        " |";
      lines.push(line);

      if (i === 0) {
        const separator =
          "| " +
          Array.from(cells)
            .map(() => "---")
            .join(" | ") +
          " |";
        lines.push(separator);
      }
    });
    return "\n" + lines.join("\n") + "\n";
  },
});

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}

export function markdownToHtml(md: string): string {
  // frontmatter 제거
  let html = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");

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
    /^- \[x\]\s+(.+)$/gm,
    '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span>$1</span></label></li></ul>'
  );
  html = html.replace(
    /^- \[ \]\s+(.+)$/gm,
    '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span>$1</span></label></li></ul>'
  );

  // 일반 리스트
  html = html.replace(/^- (.+)$/gm, "<ul><li>$1</li></ul>");

  // 테이블
  html = html.replace(/(\|.+\|\n)+/g, (match) => {
    const rows = match.trim().split("\n");
    const tableRows = rows
      .filter((row) => !row.match(/^\|\s*-+/)) // 구분선 제거
      .map((row, i) => {
        const cells = row
          .split("|")
          .filter((c) => c.trim() !== "")
          .map((c) => {
            const tag = i === 0 ? "th" : "td";
            return `<${tag}>${c.trim()}</${tag}>`;
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

  // 이미지
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // 링크
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 문단 (빈 줄로 구분)
  html = html
    .split("\n\n")
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (block.startsWith("<")) return block;
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
