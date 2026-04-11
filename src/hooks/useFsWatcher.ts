import { useEffect, useRef } from "react";
import { watch } from "@tauri-apps/plugin-fs";
import type { UnwatchFn } from "@tauri-apps/plugin-fs";
import { useAppStore } from "@/stores/appStore";

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
