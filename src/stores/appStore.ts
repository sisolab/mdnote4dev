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
}

interface AppState {
  favorites: FavoriteFolder[];
  expandedFolders: Set<string>;
  selectedFile: string | null;
  fileContent: string;

  addFavorite: (folder: FavoriteFolder) => void;
  removeFavorite: (path: string) => void;
  toggleFolder: (path: string) => void;
  setSelectedFile: (path: string | null) => void;
  setFileContent: (content: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  favorites: [
    { path: "C:\\Users\\siu\\Desktop\\Notes", name: "Notes" },
  ],
  expandedFolders: new Set<string>(),
  selectedFile: null,
  fileContent: "",

  addFavorite: (folder) =>
    set((state) => ({
      favorites: [...state.favorites, folder],
    })),

  removeFavorite: (path) =>
    set((state) => ({
      favorites: state.favorites.filter((f) => f.path !== path),
    })),

  toggleFolder: (path) =>
    set((state) => {
      const next = new Set(state.expandedFolders);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return { expandedFolders: next };
    }),

  setSelectedFile: (path) => set({ selectedFile: path }),
  setFileContent: (content) => set({ fileContent: content }),
}));
