export interface FrontmatterData {
  tags: string[];
  body: string;
  raw: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** YAML raw에서 tags 배열 추출 */
function parseTags(raw: string): string[] {
  // tags: [tag1, tag2]
  const bracketMatch = raw.match(/tags:\s*\[([^\]]*)\]/);
  if (bracketMatch) {
    return bracketMatch[1].split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  }
  // tags:\n- tag1\n- tag2
  const listMatch = raw.match(/tags:\s*\n((?:\s*-\s*.+\n?)*)/);
  if (listMatch) {
    return listMatch[1].split("\n").map((line) => line.replace(/^\s*-\s*/, "").trim()).filter(Boolean);
  }
  return [];
}

export function parseFrontmatter(content: string): FrontmatterData {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return { tags: [], body: content, raw: "" };
  const raw = match[1];
  const body = match[2];
  return { tags: parseTags(raw), body, raw };
}

export function updateFrontmatterTags(content: string, tags: string[]): string {
  const tagsStr = tags.length > 0 ? `tags: [${tags.join(", ")}]` : "";

  const match = content.match(FRONTMATTER_RE);
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

// 30개 대비되는 고정 팔레트 (색상환에서 최대 거리 배치)
// 순서: 파랑→빨강→초록→주황→보라→청록→분홍→올리브→남색→코랄 ...
const TAG_HUES = [
  210, 0, 140, 30, 270, 175, 340, 60, 240, 15,
  160, 300, 45, 195, 330, 90, 255, 120, 20, 285,
  50, 180, 315, 75, 225, 150, 10, 200, 105, 350,
];

// 태그 이름 → 색상 인덱스 매핑 (등록 순서 기반)
const tagColorMap = new Map<string, number>();

export function assignTagColors(tagNames: string[]) {
  tagColorMap.clear();
  tagNames.forEach((name, i) => {
    tagColorMap.set(name, i);
  });
}

export function getTagColor(tag: string): { bg: string; text: string } {
  const idx = tagColorMap.get(tag) ?? 0;
  const hueIdx = idx % TAG_HUES.length;
  const hue = TAG_HUES[hueIdx];
  // 30개 초과 시 파스텔 톤 (채도↓ 밝기↑)
  const cycle = Math.floor(idx / TAG_HUES.length);
  const sat = Math.max(40, 75 - cycle * 20);
  const lightBg = Math.min(95, 90 + cycle * 3);
  const lightText = Math.min(50, 35 + cycle * 8);
  return {
    bg: `hsl(${hue}, ${sat}%, ${lightBg}%)`,
    text: `hsl(${hue}, ${sat - 10}%, ${lightText}%)`,
  };
}

export function getTagColorDark(tag: string): { bg: string; text: string } {
  const idx = tagColorMap.get(tag) ?? 0;
  const hueIdx = idx % TAG_HUES.length;
  const hue = TAG_HUES[hueIdx];
  const cycle = Math.floor(idx / TAG_HUES.length);
  const sat = Math.max(25, 40 - cycle * 10);
  const lightBg = Math.max(18, 25 - cycle * 3);
  const lightText = Math.min(85, 75 + cycle * 5);
  return {
    bg: `hsl(${hue}, ${sat}%, ${lightBg}%)`,
    text: `hsl(${hue}, ${sat + 15}%, ${lightText}%)`,
  };
}
