import { create } from "zustand";
import { persist } from "zustand/middleware";
import { assignTagColors } from "@/utils/frontmatter";

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

export interface FavoriteFolder {
  path: string;
  name: string;
  alias?: string;
  icon?: string;
}

export type SortMode = "name" | "date-added" | "date-modified" | "custom";

export interface Tab {
  id: string;
  title: string;
  filePath: string | null; // null이면 임시 문서
  content: string;
  isDirty: boolean;
  type?: "document" | "tag-explorer";
  tagFilters?: string[]; // tag-explorer 탭에서 선택된 태그들
}

let tabCounter = 0;

interface AppState {
  // 즐겨찾기
  favorites: FavoriteFolder[];
  addFavorite: (folder: FavoriteFolder) => void;
  removeFavorite: (path: string) => void;
  setFavoriteAlias: (path: string, alias: string | undefined) => void;
  updateFavoritePath: (oldPath: string, newPath: string, newName: string) => void;
  setFavoriteIcon: (path: string, icon: string | undefined) => void;

  // 단일 파일 (특수 폴더)
  favoriteFiles: string[];
  addFavoriteFile: (path: string) => void;
  removeFavoriteFile: (path: string) => void;

  // 태그
  allTags: Record<string, string[]>;
  setAllTags: (tags: Record<string, string[]>) => void;

  // 최근 파일 (mtime 내림차순)
  recentFiles: string[];
  setRecentFiles: (files: string[]) => void;

  // 파일 미리보기 (파일경로 → 첫 줄 내용)
  filePreviews: Record<string, string>;
  setFilePreviews: (previews: Record<string, string>) => void;

  // 파일 본문 캐시 (검색용, 파일경로 → frontmatter 제외 본문)
  fileContents: Record<string, string>;
  setFileContents: (contents: Record<string, string>) => void;

  // 정렬
  folderSort: SortMode;
  fileSort: SortMode;
  setFolderSort: (mode: SortMode) => void;
  setFileSort: (mode: SortMode) => void;

  // 파일 트리
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;

  // 탭
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (filePath: string, title: string, content: string) => void;
  newTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabTitle: (id: string, title: string) => void;
  updateTabFilePath: (id: string, filePath: string, title: string) => void;
  markTabClean: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  openTagExplorer: (tag?: string) => void;

  // 사이드바
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  fileTreeVersion: number;
  refreshFileTree: () => void;
  selectedPaths: Set<string>;
  setSelectedPaths: (paths: Set<string>) => void;
  toggleSelectedPath: (path: string) => void;
  clearSelectedPaths: () => void;

  // 하위 호환
  selectedFile: string | null;
  fileContent: string;
  setSelectedFile: (path: string | null) => void;
  setFileContent: (content: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      favorites: [],
      addFavorite: (folder) =>
        set((state) => ({
          favorites: [...state.favorites, folder],
        })),
      removeFavorite: (path) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f.path !== path),
        })),

      setFavoriteAlias: (path, alias) =>
        set((state) => ({
          favorites: state.favorites.map((f) =>
            f.path === path ? { ...f, alias } : f
          ),
        })),

      updateFavoritePath: (oldPath, newPath, newName) =>
        set((state) => ({
          favorites: state.favorites.map((f) =>
            f.path === oldPath ? { ...f, path: newPath, name: newName } : f
          ),
        })),

      setFavoriteIcon: (path, icon) =>
        set((state) => ({
          favorites: state.favorites.map((f) =>
            f.path === path ? { ...f, icon } : f
          ),
        })),

      favoriteFiles: [] as string[],
      addFavoriteFile: (path) =>
        set((state) => ({
          favoriteFiles: state.favoriteFiles.includes(path) ? state.favoriteFiles : [...state.favoriteFiles, path],
        })),
      removeFavoriteFile: (path) =>
        set((state) => ({
          favoriteFiles: state.favoriteFiles.filter((p) => p !== path),
        })),

      allTags: {} as Record<string, string[]>,
      setAllTags: (tags) => {
        assignTagColors(Object.keys(tags).sort());
        set({ allTags: tags });
      },

      recentFiles: [] as string[],
      setRecentFiles: (files) => set({ recentFiles: files }),

      filePreviews: {} as Record<string, string>,
      setFilePreviews: (previews) => set({ filePreviews: previews }),

      fileContents: {} as Record<string, string>,
      setFileContents: (contents) => set({ fileContents: contents }),

      folderSort: "name" as SortMode,
      fileSort: "name" as SortMode,
      setFolderSort: (mode) => set({ folderSort: mode }),
      setFileSort: (mode) => set({ fileSort: mode }),

      expandedFolders: new Set<string>(),
      toggleFolder: (path) =>
        set((state) => {
          const next = new Set(state.expandedFolders);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return { expandedFolders: next };
        }),

      tabs: [{ id: "tag-explorer", title: "태그", filePath: null, content: "", isDirty: false, type: "tag-explorer" as const, tagFilters: [] }],
      activeTabId: "tag-explorer",

      openTab: (filePath, title, content) =>
        set((state) => {
          const existing = state.tabs.find((t) => t.filePath === filePath);
          if (existing) {
            return { activeTabId: existing.id, selectedFile: filePath, fileContent: content };
          }
          const id = `tab-${++tabCounter}`;
          const tab: Tab = { id, title, filePath, content, isDirty: false };
          return {
            tabs: [...state.tabs, tab],
            activeTabId: id,
            selectedFile: filePath,
            fileContent: content,
          };
        }),

      newTab: () =>
        set((state) => {
          const id = `tab-${++tabCounter}`;
          const tab: Tab = {
            id,
            title: "제목 없음",
            filePath: null,
            content: "",
            isDirty: false,
          };
          return {
            tabs: [...state.tabs, tab],
            activeTabId: id,
            selectedFile: null,
            fileContent: "",
          };
        }),

      closeTab: (id) =>
        set((state) => {
          const idx = state.tabs.findIndex((t) => t.id === id);
          const newTabs = state.tabs.filter((t) => t.id !== id);
          let newActiveId = state.activeTabId;
          if (state.activeTabId === id) {
            if (newTabs.length === 0) {
              newActiveId = null;
            } else if (idx >= newTabs.length) {
              newActiveId = newTabs[newTabs.length - 1].id;
            } else {
              newActiveId = newTabs[idx].id;
            }
          }
          const activeTab = newTabs.find((t) => t.id === newActiveId);
          return {
            tabs: newTabs,
            activeTabId: newActiveId,
            selectedFile: activeTab?.filePath ?? null,
            fileContent: activeTab?.content ?? "",
          };
        }),

      setActiveTab: (id) =>
        set((state) => {
          const tab = state.tabs.find((t) => t.id === id);
          if (!tab) return {};
          return {
            activeTabId: id,
            selectedFile: tab.filePath,
            fileContent: tab.content,
          };
        }),

      updateTabContent: (id, content) =>
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === id ? { ...t, content, isDirty: true } : t
          ),
          fileContent: state.activeTabId === id ? content : state.fileContent,
        })),

      updateTabTitle: (id, title) =>
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === id ? { ...t, title } : t
          ),
        })),

      updateTabFilePath: (id, filePath, title) =>
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === id ? { ...t, filePath, title } : t
          ),
          selectedFile: state.activeTabId === id ? filePath : state.selectedFile,
        })),

      markTabClean: (id) =>
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === id ? { ...t, isDirty: false } : t
          ),
        })),

      reorderTabs: (fromIndex, toIndex) =>
        set((state) => {
          const newTabs = [...state.tabs];
          const [moved] = newTabs.splice(fromIndex, 1);
          newTabs.splice(toIndex, 0, moved);
          return { tabs: newTabs };
        }),

      openTagExplorer: (tag) =>
        set((state) => {
          const existing = state.tabs.find((t) => t.type === "tag-explorer");
          if (existing) {
            const current = existing.tagFilters ?? [];
            const newFilters = tag ? (current.includes(tag) ? current : [...current, tag]) : current;
            return {
              tabs: state.tabs.map((t) => t.id === existing.id ? { ...t, tagFilters: newFilters } : t),
              activeTabId: existing.id,
            };
          }
          const id = `tab-${++tabCounter}`;
          const tab: Tab = { id, title: "태그 탐색", filePath: null, content: "", isDirty: false, type: "tag-explorer", tagFilters: tag ? [tag] : [] };
          return {
            tabs: [tab, ...state.tabs],
            activeTabId: id,
          };
        }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      fileTreeVersion: 0,
      refreshFileTree: () => set((state) => ({ fileTreeVersion: state.fileTreeVersion + 1 })),
      selectedPaths: new Set<string>(),
      setSelectedPaths: (paths) => set({ selectedPaths: paths }),
      toggleSelectedPath: (path) => set((state) => {
        const next = new Set(state.selectedPaths);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return { selectedPaths: next };
      }),
      clearSelectedPaths: () => set({ selectedPaths: new Set<string>() }),

      selectedFile: null,
      fileContent: "",
      setSelectedFile: (path) => set({ selectedFile: path }),
      setFileContent: (content) => set({ fileContent: content }),
    }),
    {
      name: "marknote-app",
      partialize: (state) => ({
        favorites: state.favorites,
        favoriteFiles: state.favoriteFiles,
        sidebarCollapsed: state.sidebarCollapsed,
        folderSort: state.folderSort,
        fileSort: state.fileSort,
        // Set → Array로 변환하여 저장
        expandedFolders: [...state.expandedFolders],
        // 탭: content 제외, filePath 있는 탭만 저장
        tabs: state.tabs
          .filter((t) => t.type === "tag-explorer" || t.filePath)
          .map((t) => ({ id: t.id, title: t.title, filePath: t.filePath, content: "", isDirty: false, type: t.type, tagFilters: t.tagFilters })),
        activeTabId: state.activeTabId,
      }),
      merge: (persisted: any, current: AppState) => {
        const p = persisted as Partial<AppState> & { expandedFolders?: string[] };
        return {
          ...current,
          ...p,
          // Array → Set으로 복원
          expandedFolders: new Set(p.expandedFolders ?? []),
          // 런타임 전용 상태 복원
          selectedPaths: new Set<string>(),
        };
      },
    }
  )
);
