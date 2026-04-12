import { mkdir, readDir, writeFile, rename, exists, stat } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { moveToTrash, findFavoriteRoot } from "./trashUtils";
import { useAppStore } from "@/stores/appStore";

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

/** 파일을 .assets 폴더에 복사, { relativePath, filename, size } 반환 */
export async function saveFileToAssets(docFilePath: string, srcPath: string): Promise<{ relativePath: string; filename: string; size: number }> {
  const assetsDir = getAssetsDir(docFilePath);
  const dirExists = await exists(assetsDir);
  if (!dirExists) await mkdir(assetsDir);

  const origName = srcPath.split("\\").pop() ?? srcPath.split("/").pop() ?? "file";
  const finalPath = `${assetsDir}\\${origName}`;

  // 같은 이름이 있으면 덮어쓰기
  await invoke("copy_file", { src: srcPath, dest: finalPath });
  const fileStat = await stat(finalPath);
  const size = fileStat.size;

  return { relativePath: `./.assets/${origName}`, filename: origName, size };
}

/** 마크다운에서 .assets 참조 경로 추출 (이미지 + 파일 첨부) */
export function extractAssetPaths(markdown: string): string[] {
  const paths: string[] = [];
  // 이미지: ![](src)
  const mdRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = mdRegex.exec(markdown)) !== null) {
    paths.push(match[1]);
  }
  // HTML img 태그: <img src="...">
  const htmlRegex = /<img[^>]+src="([^"]+)"/g;
  while ((match = htmlRegex.exec(markdown)) !== null) {
    paths.push(match[1]);
  }
  // 파일 첨부 링크: [name](./.assets/...)
  const linkRegex = /\[[^\]]+\]\((\.\/\.assets\/[^)]+)\)/g;
  while ((match = linkRegex.exec(markdown)) !== null) {
    paths.push(match[1]);
  }
  // asset URL (http://asset.localhost/.../.assets/filename) — 미저장 content 대응
  const assetUrlRegex = /http:\/\/asset\.localhost\/[^)"\s]*?\.assets[/\\%]([^)"\s?]+)/gi;
  while ((match = assetUrlRegex.exec(markdown)) !== null) {
    paths.push(`./.assets/${decodeURIComponent(match[1])}`);
  }
  return paths;
}

/** 해당 문서의 미참조 에셋(이미지+파일)을 휴지통으로 이동 */
export async function cleanupOrphanedImages(docFilePath: string, markdown: string): Promise<void> {
  const assetsDir = getAssetsDir(docFilePath);

  try {
    const dirExists = await exists(assetsDir);
    if (!dirExists) return;

    const entries = await readDir(assetsDir);
    const referencedPaths = new Set(extractAssetPaths(markdown));

    const favorites = useAppStore.getState().favorites;
    const favoriteRoot = findFavoriteRoot(docFilePath, favorites);
    for (const entry of entries) {
      if (!entry.name || entry.name.startsWith(".")) continue;
      const relativePath = `./.assets/${entry.name}`;
      if (!referencedPaths.has(relativePath)) {
        try {
          if (favoriteRoot) {
            await moveToTrash(`${assetsDir}\\${entry.name}`, favoriteRoot);
          } else {
            await invoke("move_to_trash", { path: `${assetsDir}\\${entry.name}` });
          }
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
