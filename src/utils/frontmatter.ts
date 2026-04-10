export interface FrontmatterData {
  tags: string[];
  body: string;
  raw: string;
}

export function parseFrontmatter(content: string): FrontmatterData {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { tags: [], body: content, raw: "" };
  }
  const raw = match[1];
  const body = match[2];

  // tags 파싱: tags: [tag1, tag2] 또는 tags:\n- tag1\n- tag2
  const tagsMatch = raw.match(/tags:\s*\[([^\]]*)\]/);
  if (tagsMatch) {
    const tags = tagsMatch[1]
      .split(",")
      .map((t) => t.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
    return { tags, body, raw };
  }

  // YAML list 형태
  const listMatch = raw.match(/tags:\s*\n((?:\s*-\s*.+\n?)*)/);
  if (listMatch) {
    const tags = listMatch[1]
      .split("\n")
      .map((line) => line.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
    return { tags, body, raw };
  }

  return { tags: [], body, raw };
}

export function updateFrontmatterTags(content: string, tags: string[]): string {
  const tagsStr = tags.length > 0 ? `tags: [${tags.join(", ")}]` : "";

  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    // frontmatter 없음 → 추가
    if (tags.length === 0) return content;
    return `---\n${tagsStr}\n---\n${content}`;
  }

  const raw = match[1];
  const body = match[2];

  // 기존 tags 라인 교체
  let newRaw: string;
  if (raw.match(/tags:\s*\[/)) {
    newRaw = raw.replace(/tags:\s*\[[^\]]*\]/, tagsStr);
  } else if (raw.match(/tags:\s*\n(?:\s*-\s*.+\n?)*/)) {
    newRaw = raw.replace(/tags:\s*\n(?:\s*-\s*.+\n?)*/, tagsStr);
  } else {
    // tags 필드 없음 → 추가
    newRaw = tagsStr ? `${raw}\n${tagsStr}` : raw;
  }

  // frontmatter가 비면 제거
  if (!newRaw.trim()) {
    return body;
  }

  return `---\n${newRaw}\n---\n${body}`;
}

export function getTagColor(tag: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 75%, 90%)`,
    text: `hsl(${hue}, 65%, 35%)`,
  };
}

export function getTagColorDark(tag: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 35%, 25%)`,
    text: `hsl(${hue}, 55%, 75%)`,
  };
}
