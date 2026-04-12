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

export interface AttachmentInfo {
  filename: string;
  absPath: string;
  relativePath: string;
  docPath: string; // 이 첨부파일이 포함된 마크다운 문서 경로
  size: number;
  mtime: number;
  ext: string;
}

export interface Tab {
  id: string;
  title: string;
  filePath: string | null; // null이면 임시 문서
  content: string;
  isDirty: boolean;
  pinned?: boolean;
  type?: "document" | "tag-explorer" | "attachment-explorer";
  tagFilters?: string[]; // tag-explorer 탭에서 선택된 태그들
}

let tabCounter = Date.now();

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

  // 즐겨찾기 순서
  reorderFavorites: (fromIndex: number, toIndex: number) => void;

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

  // 커스텀 파일 순서 (폴더경로 → 파일/폴더명 배열)
  customFileOrder: Record<string, string[]>;
  setCustomFileOrder: (folderPath: string, order: string[]) => void;

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
  pinTab: (id: string) => void;
  unpinTab: (id: string) => void;
  openTagExplorer: (tag?: string) => void;
  openAttachmentExplorer: () => void;

  // 첨부파일
  allAttachments: AttachmentInfo[];
  setAllAttachments: (attachments: AttachmentInfo[]) => void;
  favoriteAttachments: string[];
  addFavoriteAttachment: (path: string) => void;
  removeFavoriteAttachment: (path: string) => void;

  // 사이드바
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
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

      reorderFavorites: (fromIndex, toIndex) =>
        set((state) => {
          const newFavorites = [...state.favorites];
          const [moved] = newFavorites.splice(fromIndex, 1);
          newFavorites.splice(toIndex, 0, moved);
          return { favorites: newFavorites };
        }),

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

      customFileOrder: {} as Record<string, string[]>,
      setCustomFileOrder: (folderPath, order) =>
        set((state) => ({
          customFileOrder: { ...state.customFileOrder, [folderPath]: order },
        })),

      expandedFolders: new Set<string>(),
      toggleFolder: (path) =>
        set((state) => {
          const next = new Set(state.expandedFolders);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return { expandedFolders: next };
        }),

      tabs: [
        { id: "tag-explorer", title: "검색", filePath: null, content: "", isDirty: false, type: "tag-explorer" as const, tagFilters: [] },
        { id: "attachment-explorer", title: "첨부파일", filePath: null, content: "", isDirty: false, type: "attachment-explorer" as const },
      ],
      activeTabId: "tag-explorer",

      openTab: (filePath, title, content) =>
        set((state) => {
          // 최근 문서 리스트 갱신: 맨 앞으로 이동
          const recentFiles = filePath
            ? [filePath, ...state.recentFiles.filter((p) => p !== filePath)].slice(0, 50)
            : state.recentFiles;
          const existing = state.tabs.find((t) => t.filePath === filePath);
          if (existing) {
            return { activeTabId: existing.id, selectedFile: filePath, fileContent: content, recentFiles };
          }
          const id = `tab-${++tabCounter}`;
          const tab: Tab = { id, title, filePath, content, isDirty: false };
          return {
            tabs: [...state.tabs, tab],
            activeTabId: id,
            selectedFile: filePath,
            fileContent: content,
            recentFiles,
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
            const searchTab = newTabs.find((t) => t.type === "tag-explorer");
            const docTabs = newTabs.filter((t) => t.type !== "tag-explorer" && t.type !== "attachment-explorer");
            if (docTabs.length === 0) {
              // 문서 탭 없으면 검색탭
              newActiveId = searchTab?.id ?? newTabs[0]?.id ?? null;
            } else if (idx > 0 && idx <= newTabs.length) {
              // 이전 탭으로 포커스
              newActiveId = newTabs[Math.min(idx - 1, newTabs.length - 1)].id;
            } else if (newTabs[idx]) {
              newActiveId = newTabs[idx].id;
            } else {
              newActiveId = searchTab?.id ?? newTabs[0]?.id ?? null;
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

      pinTab: (id) =>
        set((state) => ({
          tabs: state.tabs.map((t) => t.id === id ? { ...t, pinned: true } : t),
        })),
      unpinTab: (id) =>
        set((state) => ({
          tabs: state.tabs.map((t) => t.id === id ? { ...t, pinned: false } : t),
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

      openAttachmentExplorer: () =>
        set((state) => {
          const existing = state.tabs.find((t) => t.type === "attachment-explorer");
          if (existing) return { activeTabId: existing.id };
          const id = `tab-${++tabCounter}`;
          const tab: Tab = { id, title: "첨부파일", filePath: null, content: "", isDirty: false, type: "attachment-explorer" };
          return { tabs: [tab, ...state.tabs], activeTabId: id };
        }),

      allAttachments: [],
      setAllAttachments: (attachments) => set({ allAttachments: attachments }),
      favoriteAttachments: [],
      addFavoriteAttachment: (path) => set((state) => ({
        favoriteAttachments: state.favoriteAttachments.includes(path) ? state.favoriteAttachments : [...state.favoriteAttachments, path],
      })),
      removeFavoriteAttachment: (path) => set((state) => ({
        favoriteAttachments: state.favoriteAttachments.filter((p) => p !== path),
      })),

      sidebarCollapsed: false,
      sidebarWidth: 280,
      setSidebarWidth: (w) => set({ sidebarWidth: w }),
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
        sidebarWidth: state.sidebarWidth,
        folderSort: state.folderSort,
        fileSort: state.fileSort,
        customFileOrder: state.customFileOrder,
        // Set → Array로 변환하여 저장
        expandedFolders: [...state.expandedFolders],
        // 탭: content 제외, filePath 있는 탭만 저장
        favoriteAttachments: state.favoriteAttachments,
        tabs: state.tabs
          .filter((t) => t.type === "tag-explorer" || t.type === "attachment-explorer" || t.filePath)
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
