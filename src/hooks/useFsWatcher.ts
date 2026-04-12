import { useEffect, useRef } from "react";
import { watch, exists, readDir } from "@tauri-apps/plugin-fs";
import type { UnwatchFn } from "@tauri-apps/plugin-fs";
import { useAppStore } from "@/stores/appStore";

async function syncTabPaths() {
  const store = useAppStore.getState();
  for (const tab of store.tabs) {
    if (!tab.filePath) continue;
    const fileExists = await exists(tab.filePath).catch(() => false);
    if (fileExists) continue;
    // 파일이 없어졌으면 같은 폴더에서 같은 확장자의 새 파일 탐색 (rename 감지)
    const dir = tab.filePath.substring(0, tab.filePath.lastIndexOf("\\"));
    const oldName = tab.filePath.substring(tab.filePath.lastIndexOf("\\") + 1);
    try {
      const entries = await readDir(dir);
      // 같은 확장자 파일 중 기존에 탭으로 안 열려있는 새 파일 찾기
      const ext = oldName.includes(".") ? oldName.substring(oldName.lastIndexOf(".")) : "";
      const openPaths = new Set(store.tabs.filter((t) => t.filePath).map((t) => t.filePath));
      const candidate = entries.find((e) =>
        !e.isDirectory && e.name?.endsWith(ext) && !openPaths.has(`${dir}\\${e.name}`)
      );
      if (candidate?.name) {
        store.updateTabFilePath(tab.id, `${dir}\\${candidate.name}`, candidate.name);
      }
    } catch {}
  }
}

export function useFsWatcher() {
  const favorites = useAppStore((s) => s.favorites);
  const unwatchRef = useRef<UnwatchFn | null>(null);

  useEffect(() => {
    const paths = favorites.map((f) => f.path);
    if (paths.length === 0) return;

    let cancelled = false;

    async function setup() {
      if (unwatchRef.current) {
        unwatchRef.current();
        unwatchRef.current = null;
      }

      try {
        const unwatch = await watch(
          paths,
          () => {
            if (!cancelled) {
              useAppStore.getState().refreshFileTree();
              syncTabPaths();
            }
          },
          { recursive: true, delayMs: 500 },
        );
        if (cancelled) {
          unwatch();
        } else {
          unwatchRef.current = unwatch;
        }
      } catch (err) {
        console.error("fs watch failed:", err);
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (unwatchRef.current) {
        unwatchRef.current();
        unwatchRef.current = null;
      }
    };
  }, [favorites]);
}
