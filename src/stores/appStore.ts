import { create } from "zustand";

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
}

export interface Tab {
  id: string;
  title: string;
  filePath: string | null; // null이면 임시 문서
  content: string;
  isDirty: boolean;
}

let tabCounter = 0;

interface AppState {
  // 작업 폴더
  workspace: string | null;
  setWorkspace: (path: string | null) => void;

  // 즐겨찾기
  favorites: FavoriteFolder[];
  addFavorite: (folder: FavoriteFolder) => void;
  removeFavorite: (path: string) => void;
  setFavoriteAlias: (path: string, alias: string | undefined) => void;

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

export const useAppStore = create<AppState>((set) => ({
  workspace: "C:\\Users\\siu\\Desktop\\Notes",
  setWorkspace: (path) => set({ workspace: path }),

  favorites: [
    { path: "C:\\Users\\siu\\Desktop\\Notes", name: "Notes" },
  ],
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

  expandedFolders: new Set<string>(),
  toggleFolder: (path) =>
    set((state) => {
      const next = new Set(state.expandedFolders);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { expandedFolders: next };
    }),

  tabs: [],
  activeTabId: null,

  openTab: (filePath, title, content) =>
    set((state) => {
      // 이미 열려있으면 활성화
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
}));
