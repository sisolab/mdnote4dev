# State & Utilities — Combined Reference

> AI/개발자용. 상태 관리, 유틸리티, 설정의 코드 레벨 상세.

## 아키텍처 개요

```
App.tsx (루트)
  ├── 테마/스페이싱 CSS 변수 적용
  ├── 앱 시작 시 파일/태그/첨부파일 스캔
  ├── 글로벌 단축키
  ├── 앱 종료 처리 (cleanup, trash 비우기)
  │
  ├── Stores (Zustand)
  │   ├── appStore ─── 탭, 즐겨찾기, 태그, 첨부파일, 파일 트리
  │   ├── settingsStore ─── 에디터 설정, 테마, 스페이싱
  │   └── undoStore ─── undo/redo 히스토리
  │
  ├── Utils
  │   ├── frontmatter ─── YAML 파싱, 태그 색상
  │   ├── imageUtils ─── 이미지/파일 저장, 정리, 이름변경
  │   ├── fileOps ─── 파일 이동, undo
  │   ├── trashUtils ─── .trash 관리
  │   └── pathUtils ─── 경로 단축
  │
  └── Hooks
      └── useFsWatcher ─── FS 실시간 감시
```

## 파일 맵

| 파일 | 줄 | 역할 |
|------|------|------|
| `App.tsx` | 392 | 루트 컴포넌트. 테마, 스캔, 단축키, 종료 |
| `stores/appStore.ts` | 424 | 앱 핵심 상태. persist (localStorage) |
| `stores/settingsStore.ts` | 277 | 에디터/테마/스페이싱 설정. persist |
| `stores/undoStore.ts` | 68 | undo/redo 스택 (최대 50) |
| `stores/themeData.ts` | 81 | 4개 테마 CSS 변수 정의 |
| `utils/frontmatter.ts` | 110 | frontmatter 파싱, 태그 색상 |
| `utils/imageUtils.ts` | 173 | 이미지/파일 에셋 관리 |
| `utils/fileOps.ts` | 112 | 파일 이동 + undo |
| `utils/trashUtils.ts` | 57 | 앱 내 .trash 관리 |
| `utils/pathUtils.ts` | 16 | 경로 유틸리티 |
| `hooks/useFsWatcher.ts` | 53 | FS 감시 훅 |

---

## appStore.ts — 앱 핵심 상태

### 주요 인터페이스
```typescript
interface FileEntry {
  name: string; path: string; isDirectory: boolean; children?: FileEntry[];
}

interface FavoriteFolder {
  path: string; name: string; alias?: string; icon?: string;
}

interface AttachmentInfo {
  filename: string; absPath: string; relativePath: string;
  docPath: string; size: number; mtime: number; ext: string;
}

interface Tab {
  id: string; title: string; filePath: string; content: string;
  isDirty: boolean;
  type: "document" | "tag-explorer" | "attachment-explorer";
  tagFilters?: string[];
}

type SortMode = "name" | "date" | "custom";
```

### 상태 그룹

| 그룹 | 상태 | persist |
|------|------|---------|
| **즐겨찾기** | favorites, favoriteFiles, favoriteAttachments | O |
| **태그** | allTags (Record<tag, filePaths[]>) | X |
| **파일 캐시** | filePreviews, fileContents, recentFiles | X |
| **정렬** | folderSort, fileSort (SortMode) | O |
| **커스텀 순서** | customFileOrder (Record<folder, paths[]>) | O |
| **탭** | tabs, activeTabId | O (content 제외) |
| **첨부파일** | allAttachments | X |
| **사이드바** | sidebarCollapsed, sidebarWidth | O |
| **트리** | expandedFolders (Set), fileTreeVersion, selectedPaths | O (expandedFolders만) |

### persist 설정
```
key: "marknote-app"
storage: localStorage
partialize: content, selectedPaths 등 런타임 전용 상태 제외
merge: expandedFolders를 Array → Set으로 복원
```

### 탭 관리 핵심 함수

| 함수 | 동작 |
|------|------|
| `openTab(filePath, title, content)` | 이미 열린 탭이면 활성화, 아니면 새 탭 생성 |
| `newTab()` | "새 문서" 임시 탭 (filePath 없음) |
| `closeTab(id)` | 탭 삭제 → tag-explorer 탭으로 폴백 → 첫 탭으로 폴백 |
| `openTagExplorer()` | tag-explorer 탭 활성화 (없으면 생성) |
| `openAttachmentExplorer()` | attachment-explorer 탭 활성화 (없으면 생성) |
| `reorderTabs(from, to)` | 탭 순서 변경 (드래그) |

---

## settingsStore.ts — 에디터 설정

### EditorSettings
```typescript
interface EditorSettings {
  fontSize: number;       // 기본 15
  fontFamily: string;     // 기본 "system"
  letterSpacing: number;  // 기본 0
  lineHeight: number;     // 기본 1.8
  paragraphSpacing: number; // 기본 0.5
  codePadding: number;    // 기본 16
  editorPaddingX: number; // 기본 48
  editorPaddingY: number; // 기본 40
  editorMaxWidth: number; // 기본 720
  widthMode: "fixed" | "fluid"; // 기본 "fixed"
  pageAlign: "left" | "center"; // 기본 "center"
  headingScale: number;   // 기본 1.2
  codeFontSize: number;   // 기본 13
  codeLineHeight: number; // 기본 1.5
}
```

### 에디터 프리셋
| 이름 | fontSize | lineHeight | editorPaddingX | editorMaxWidth |
|------|----------|------------|----------------|----------------|
| Compact | 13 | 1.4 | 32 | 640 |
| Basic (기본) | 15 | 1.8 | 48 | 720 |
| Relaxed | 17 | 2.0 | 64 | 840 |

프리셋 적용 시 fontFamily는 변경하지 않음.

### 스페이싱 스타일
```typescript
interface SpacingStyle {
  h1mt: number; h1mb: number; h2mt: number; h2mb: number;
  h3mt: number; h3mb: number; h4mt: number; h4mb: number;
  p: number; li: number; pre: number; bq: number; hr: number;
}

type SpacingStyleName = "default" | "general";
```

| 프리셋 | 특징 |
|--------|------|
| Default (간결) | 문단 간격 0, 제목 위 여백 크고 아래 작음 |
| General (넉넉) | 문단 간격 있음, 아티클 느낌 |

App.tsx에서 CSS 변수로 적용: `--style-h1-mt`, `--style-p`, `--style-li` 등

### 테마 시스템
| 테마 | 배경 | 글자색 |
|------|------|--------|
| light | #ffffff | #333333 |
| newspaper | #f5f0e8 (베이지) | #1a1611 (갈색) |
| charcoal | #363839 (진회색) | #dcdcdc |
| dark | #1e1e1e | #e0e0e0 |

악센트 색상: blue, emerald, orange, yellow, purple (각각 HSL로 light/dark 변형)

### 폰트 옵션
```
시스템 기본, Noto Sans KR, IBM Plex Sans KR, Nanum Gothic,
Pretendard, D2Coding, Noto Serif KR, Nanum Myeongjo
+ 일본어 (Noto Sans JP) + 중국어 (Noto Sans SC)
```

### persist 설정
```
key: "marknote-settings"
storage: localStorage
```

---

## undoStore.ts — Undo/Redo

```typescript
interface UndoableAction {
  type: string;           // "move", "delete", "rename", "reorder" 등
  description: string;    // UI 표시용
  execute(): Promise<void>;
  undo(): Promise<void>;
}
```

| 속성 | 값 |
|------|-----|
| 최대 히스토리 | 50 |
| persist | X (메모리만) |
| 새 액션 push 시 | redo 스택 클리어 |

`executeUndoable(action)`: execute 실행 후 push. 에디터 외부 Ctrl+Z/Shift+Z로 undo/redo.

---

## frontmatter.ts — YAML 파싱 & 태그 색상

### 파싱
```
정규식: /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
태그 형식 2가지:
  tags: [tag1, tag2]     (인라인)
  tags:                  (리스트)
    - tag1
    - tag2
```

### 태그 색상 시스템
```
30색 고정 팔레트 (색상환 균등 배치)
  → hues: [210, 0, 120, 30, 270, 180, 330, 60, 300, 150, ...]

첫 30개: hue에서 직접 HSL 생성
31번째~: cycle 번호에 따라 채도↓ 밝기↑ (파스텔 톤)

Light 테마: bg hsl(hue, 40-75%, 90-95%), text hsl(hue, 50%, 35%)
Dark 테마:  bg hsl(hue, 25-40%, 18-25%), text hsl(hue, 50%, 75%)
```

---

## imageUtils.ts — 에셋 관리

### 파일 이름 규칙
```
이미지: {문서명}-{timestamp}-{4hex}.{ext}
첨부:   원본 파일명 그대로
저장 위치: {문서폴더}/.assets/
```

### 핵심 함수
| 함수 | 입력 → 출력 |
|------|-------------|
| `saveImageToAssets(docPath, blob)` | blob → `.assets/` 파일 쓰기 → 상대경로 반환 |
| `saveFileToAssets(docPath, srcPath)` | 원본파일 → `.assets/`에 복사 → {relativePath, filename, size} |
| `extractAssetPaths(markdown)` | 마크다운 → `.assets/` 참조 경로 배열 |
| `cleanupOrphanedImages(docPath, md)` | `.assets/` 스캔 → 미참조 파일 → moveToTrash |
| `renameDocImages(dir, old, new, md)` | 이미지 파일명 접두사 변경 + 마크다운 경로 업데이트 |
| `deleteDocImages(docPath)` | 문서의 모든 에셋 → OS 휴지통 |

### extractAssetPaths 정규식
```
1. ![...](src)           — 마크다운 이미지
2. <img src="...">       — HTML 이미지
3. [name](./.assets/...) — 파일 첨부 링크
```

---

## fileOps.ts — 파일 이동

### moveItems(paths, targetFolder)
```
1. 대상 존재 확인 → 중복이면 "(1)" 추가
2. rename(old, new) — Tauri fs
3. expandedFolders 업데이트 (경로 prefix 치환)
4. 열린 탭 filePath 업데이트
5. 즐겨찾기 파일 경로 업데이트
6. 마크다운 → renameDocImages로 이미지 경로 업데이트
반환: { oldPaths, newPaths }
```

### undoMoveItems(oldPaths, newPaths)
```
역방향 rename + 탭/즐겨찾기 경로 원복
```

---

## trashUtils.ts — 앱 내 휴지통

### 구조
```
{즐겨찾기 폴더}/
  ├── .trash/           ← 앱 내 휴지통
  │   ├── file1-1712345678
  │   └── file2-1712345690
  └── .assets/          ← 이미지/첨부 저장소
```

### 함수
| 함수 | 동작 |
|------|------|
| `findFavoriteRoot(filePath)` | 파일이 속한 즐겨찾기 폴더 찾기 |
| `moveToTrash(filePath, root)` | `.trash/{name}-{timestamp}`로 이동 |
| `restoreFromTrash(trash, original)` | 원래 위치로 복원 |
| `emptyTrash(root)` | `.trash/` 비우기 → OS 휴지통으로 |

---

## pathUtils.ts — 경로 유틸

```typescript
shortenPath("C:\\Users\\siu\\Documents\\note.md")
  → "~\\Documents\\note.md"

getFileName("C:\\folder\\file.md") → "file.md"
getDirPath("C:\\folder\\file.md")  → "C:\\folder"
```

Windows 경로 전용 (백슬래시).

---

## useFsWatcher.ts — FS 감시 훅

```
favorites 변경 시 재설정
→ watch(paths, { recursive: true, delayMs: 500 })
→ 변경 콜백 → refreshFileTree()
→ cleanup: unwatch() + cancelled 플래그
```

Tauri `tauri-plugin-fs` 플러그인 필요. Cargo.toml: `features = ["watch"]`.

---

## App.tsx — 앱 라이프사이클

### 시작 순서
```
1. Zustand persist hydration 대기 (onFinishHydration)
2. 테마/스페이싱 CSS 변수 적용
3. 즐겨찾기 폴더 스캔:
   a. collectMdFiles() — 재귀적 .md 수집
   b. frontmatter 파싱 → allTags 구축
   c. 미리보기 캐시 (본문 첫 2줄, 100자)
   d. 본문 캐시 (검색용)
   e. 최근 파일 (mtime 상위 50)
   f. 첨부파일 스캔 (.assets/ 비이미지 링크)
4. 탭 복원 (파일 존재 확인 → 없는 탭 제거)
5. FS 감시 시작 (useFsWatcher)
```

### 글로벌 단축키
| 단축키 | 조건 | 동작 |
|--------|------|------|
| Ctrl+Z | 에디터 외부 | undo (파일 작업) |
| Ctrl+Shift+Z | 에디터 외부 | redo |
| Ctrl+W | - | 탭 닫기 |
| Ctrl+N | - | 새 탭 |
| Ctrl+Tab | - | 다음 탭 |
| Ctrl+Shift+Tab | - | 이전 탭 |
| Ctrl+Shift+F | - | 검색 탭 |
| Ctrl+Shift+A | - | 첨부파일 탭 |

### 종료 순서
```
1. event.preventDefault() — 즉시 종료 방지
2. 미저장 임시 문서 확인 → 있으면 확인 다이얼로그
3. 열린 탭의 고아 이미지 cleanup (cleanupOrphanedImages)
4. 각 즐겨찾기 폴더의 .trash/ 비우기 (emptyTrash → OS 휴지통)
5. undo 히스토리 클리어
6. appWindow.destroy()
```

### 드래그 앤 드롭 (외부 파일)
```
onDragDropEvent → .md 파일이면 탭으로 열기
```
