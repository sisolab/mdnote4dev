import { mkdir, readDir, writeFile, rename, exists } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

/** 문서 파일경로에서 문서명(확장자 제외) 추출 */
function getDocName(docFilePath: string): string {
  const name = docFilePath.split("\\").pop() ?? "";
  return name.replace(/\.(md|markdown)$/i, "");
}

/** 문서 파일경로에서 .assets 폴더 경로 반환 */
export function getAssetsDir(docFilePath: string): string {
  const dir = docFilePath.substring(0, docFilePath.lastIndexOf("\\"));
  return `${dir}\\.assets`;
}

/** 이미지 파일명 생성: {문서명}-{timestamp}-{4hex}.{ext} */
function generateImageFilename(docName: string, mimeType: string): string {
  const ext = mimeType === "image/jpeg" ? "jpg"
    : mimeType === "image/gif" ? "gif"
    : mimeType === "image/webp" ? "webp"
    : "png";
  const timestamp = Date.now();
  const hex = Math.random().toString(16).substring(2, 6);
  return `${docName}-${timestamp}-${hex}.${ext}`;
}

/** 클립보드 이미지 blob을 .assets 폴더에 저장, 상대경로 반환 */
export async function saveImageToAssets(docFilePath: string, blob: Blob): Promise<string> {
  const assetsDir = getAssetsDir(docFilePath);
  const docName = getDocName(docFilePath);
  const filename = generateImageFilename(docName, blob.type);

  // .assets 폴더 생성 (없으면)
  const dirExists = await exists(assetsDir);
  if (!dirExists) {
    await mkdir(assetsDir);
  }

  // blob → Uint8Array → 파일 쓰기
  const buffer = await blob.arrayBuffer();
  await writeFile(`${assetsDir}\\${filename}`, new Uint8Array(buffer));

  return `./.assets/${filename}`;
}

/** 마크다운에서 이미지 경로 추출 */
export function extractImagePaths(markdown: string): string[] {
  const regex = /!\[[^\]]*\]\(([^)]+)\)/g;
  const paths: string[] = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

/** 해당 문서의 미참조 이미지를 휴지통으로 이동 */
export async function cleanupOrphanedImages(docFilePath: string, markdown: string): Promise<void> {
  const assetsDir = getAssetsDir(docFilePath);
  const docName = getDocName(docFilePath);
  const prefix = `${docName}-`;

  try {
    const dirExists = await exists(assetsDir);
    if (!dirExists) return;

    const entries = await readDir(assetsDir);
    const referencedPaths = new Set(extractImagePaths(markdown));

    for (const entry of entries) {
      if (!entry.name?.startsWith(prefix)) continue;
      const relativePath = `./.assets/${entry.name}`;
      if (!referencedPaths.has(relativePath)) {
        try {
          await invoke("move_to_trash", { path: `${assetsDir}\\${entry.name}` });
        } catch {}
      }
    }
  } catch {}
}

/** 문서 이름변경 시 이미지 파일명 일괄 변경, 새 마크다운 반환 */
export async function renameDocImages(
  docDir: string,
  oldName: string,
  newName: string,
  markdown: string,
): Promise<string> {
  const assetsDir = `${docDir}\\.assets`;
  const oldPrefix = `${oldName}-`;
  const newPrefix = `${newName}-`;

  try {
    const dirExists = await exists(assetsDir);
    if (!dirExists) return markdown;

    const entries = await readDir(assetsDir);
    let updatedMarkdown = markdown;

    for (const entry of entries) {
      if (!entry.name?.startsWith(oldPrefix)) continue;
      const newFilename = `${newPrefix}${entry.name.substring(oldPrefix.length)}`;
      await rename(`${assetsDir}\\${entry.name}`, `${assetsDir}\\${newFilename}`);
      // 마크다운 내 경로도 업데이트
      updatedMarkdown = updatedMarkdown.replaceAll(
        `./.assets/${entry.name}`,
        `./.assets/${newFilename}`,
      );
    }

    return updatedMarkdown;
  } catch {
    return markdown;
  }
}

/** 문서 삭제 시 해당 이미지 전부 휴지통으로 */
export async function deleteDocImages(docFilePath: string): Promise<void> {
  const assetsDir = getAssetsDir(docFilePath);
  const docName = getDocName(docFilePath);
  const prefix = `${docName}-`;

  try {
    const dirExists = await exists(assetsDir);
    if (!dirExists) return;

    const entries = await readDir(assetsDir);
    for (const entry of entries) {
      if (!entry.name?.startsWith(prefix)) continue;
      try {
        await invoke("move_to_trash", { path: `${assetsDir}\\${entry.name}` });
      } catch {}
    }
  } catch {}
}
