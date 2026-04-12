import { rename, mkdir, exists, readDir } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

/** .trash 폴더 경로 (즐겨찾기 폴더 루트 기준) */
function getTrashDir(folderRoot: string): string {
  return `${folderRoot}\\.trash`;
}

/** 파일/폴더의 즐겨찾기 루트 경로 찾기 */
export function findFavoriteRoot(filePath: string, favorites: { path: string }[]): string | null {
  for (const fav of favorites) {
    if (filePath.startsWith(fav.path + "\\") || filePath === fav.path) {
      return fav.path;
    }
  }
  return null;
}

/** 파일/폴더를 .trash로 이동 (undo 가능) */
export async function moveToTrash(
  filePath: string,
  favoriteRoot: string,
): Promise<{ trashPath: string; originalPath: string }> {
  const trashDir = getTrashDir(favoriteRoot);
  const dirExists = await exists(trashDir);
  if (!dirExists) await mkdir(trashDir);

  const name = filePath.split("\\").pop() ?? "unknown";
  const timestamp = Date.now();
  const trashName = `${name}-${timestamp}`;
  const trashPath = `${trashDir}\\${trashName}`;

  await rename(filePath, trashPath);
  return { trashPath, originalPath: filePath };
}

/** .trash에서 원래 위치로 복원 */
export async function restoreFromTrash(trashPath: string, originalPath: string): Promise<void> {
  const dir = originalPath.substring(0, originalPath.lastIndexOf("\\"));
  if (!(await exists(dir))) await mkdir(dir, { recursive: true });
  await rename(trashPath, originalPath);
}

/** .trash 폴더의 모든 항목을 OS 휴지통으로 이동 (앱 종료 시 호출) */
export async function emptyTrash(favoriteRoot: string): Promise<void> {
  const trashDir = getTrashDir(favoriteRoot);
  try {
    const dirExists = await exists(trashDir);
    if (!dirExists) return;

    const entries = await readDir(trashDir);
    for (const entry of entries) {
      try {
        await invoke("move_to_trash", { path: `${trashDir}\\${entry.name}` });
      } catch {}
    }
  } catch {}
}
