import { rename, exists } from "@tauri-apps/plugin-fs";
import { useAppStore } from "@/stores/appStore";
import { renameDocImages } from "./imageUtils";

/** 파일/폴더를 다른 폴더로 이동 */
export async function moveItems(
  paths: string[],
  targetFolder: string,
): Promise<{ oldPaths: string[]; newPaths: string[] }> {
  const oldPaths: string[] = [];
  const newPaths: string[] = [];

  for (const srcPath of paths) {
    const name = srcPath.split("\\").pop() ?? "";
    let destPath = `${targetFolder}\\${name}`;

    // 같은 폴더면 스킵
    const srcDir = srcPath.substring(0, srcPath.lastIndexOf("\\"));
    if (srcDir === targetFolder) continue;

    // 중복 이름 처리
    let counter = 1;
    while (await exists(destPath)) {
      const ext = name.match(/\.[^.]+$/)?.[0] ?? "";
      const baseName = name.replace(/\.[^.]+$/, "");
      destPath = `${targetFolder}\\${baseName} (${counter})${ext}`;
      counter++;
    }

    // 마크다운 파일이면 이미지 경로도 업데이트
    if (/\.(md|markdown)$/i.test(name)) {
      const oldDocName = name.replace(/\.(md|markdown)$/i, "");
      const state = useAppStore.getState();
      const openTab = state.tabs.find((t) => t.filePath === srcPath);
      if (openTab) {
        const updated = await renameDocImages(srcDir, oldDocName, oldDocName, openTab.content);
        if (updated !== openTab.content) {
          const { writeTextFile } = await import("@tauri-apps/plugin-fs");
          await writeTextFile(srcPath, updated);
          state.updateTabContent(openTab.id, updated);
        }
      }
    }

    await rename(srcPath, destPath);

    const state = useAppStore.getState();

    // 폴더 펼침 상태 이전 (하위 폴더 포함)
    const { expandedFolders, toggleFolder } = state;
    for (const expanded of [...expandedFolders]) {
      if (expanded === srcPath || expanded.startsWith(srcPath + "\\")) {
        const newExpandedPath = destPath + expanded.substring(srcPath.length);
        if (!expandedFolders.has(newExpandedPath)) toggleFolder(newExpandedPath);
      }
    }

    // 열린 탭 경로 업데이트 (폴더 이동 시 하위 파일 포함)
    for (const tab of state.tabs) {
      if (!tab.filePath) continue;
      if (tab.filePath === srcPath || tab.filePath.startsWith(srcPath + "\\")) {
        const newTabPath = destPath + tab.filePath.substring(srcPath.length);
        const newTabName = newTabPath.split("\\").pop() ?? "";
        state.updateTabFilePath(tab.id, newTabPath, newTabName);
      }
    }

    // 즐겨찾기 경로 업데이트 (하위 파일 포함)
    for (const fav of [...state.favoriteFiles]) {
      if (fav === srcPath || fav.startsWith(srcPath + "\\")) {
        const newFavPath = destPath + fav.substring(srcPath.length);
        state.removeFavoriteFile(fav);
        state.addFavoriteFile(newFavPath);
      }
    }

    oldPaths.push(srcPath);
    newPaths.push(destPath);
  }

  return { oldPaths, newPaths };
}

/** 이동 되돌리기 */
export async function undoMoveItems(oldPaths: string[], newPaths: string[]): Promise<void> {
  for (let i = 0; i < newPaths.length; i++) {
    const srcPath = newPaths[i];
    const destPath = oldPaths[i];

    await rename(srcPath, destPath);

    const state = useAppStore.getState();
    for (const tab of state.tabs) {
      if (!tab.filePath) continue;
      if (tab.filePath === srcPath || tab.filePath.startsWith(srcPath + "\\")) {
        const newTabPath = destPath + tab.filePath.substring(srcPath.length);
        const newTabName = newTabPath.split("\\").pop() ?? "";
        state.updateTabFilePath(tab.id, newTabPath, newTabName);
      }
    }

    for (const fav of [...state.favoriteFiles]) {
      if (fav === srcPath || fav.startsWith(srcPath + "\\")) {
        const newFavPath = destPath + fav.substring(srcPath.length);
        state.removeFavoriteFile(fav);
        state.addFavoriteFile(newFavPath);
      }
    }
  }
}
