# Marknote 설계 컨텍스트

## 앱 철학
- **"파일 자체에 데이터"** — 모든 문서는 표준 마크다운(.md), 메타데이터는 frontmatter
- 서비스 없이도 데이터는 온전히 사용자 소유
- 다른 마크다운 앱에서도 문서를 열 수 있어야 함

## 아키텍처 요약
- **Tauri v2** + React 19 + TypeScript + Vite + Tailwind CSS v4
- **TipTap** (ProseMirror) WYSIWYG 에디터
- **Zustand** 상태 관리 (persist 미들웨어로 localStorage 저장)
- **Lucide React** 아이콘

## UI 디자인 철학: "미니멀, 그러나 여유있게"

### 핵심 원칙
- **미니멀**: 장식 최소화. 불필요한 테두리, 그림자, 그라디언트 없음
- **여유있는 패딩**: 요소 간 간격은 넉넉하게
- **미니멀 인디케이터**: 선택/활성 상태는 짧은 라인으로 표현
- **슬라이딩 하이라이트**: 호버 시 배경이 부드럽게 따라다니는 애니메이션
- **플랫하지만 고급스럽게**: 색상 대비와 미세한 라인으로 깊이 표현

### 레이아웃
- **사이드바**: 폴더 관리 (Documents 섹션), 하단 액션바
- **탭바**: 문서 탭 + 검색 탭(고정), 우측에 새탭/열기/설정/확장 버튼
- **검색 탭**: 파일 검색 → 태그 필터 → 즐겨찾기 → 최근 문서
- **편집 영역**: 툴바 + WYSIWYG 에디터 + 하단 상태바
- **상태바**: 파일 정보 + 태그 관리, 접기/펼치기 가능

## 핵심 로직

### 태그 시스템
- **저장**: 마크다운 frontmatter (`---\ntags: [tag1, tag2]\n---`)
- **색상**: 30색 고정 팔레트 (색상환 최대 거리 배치), 30개 초과 시 파스텔 톤 순환
- **스캔**: 앱 시작 시 즐겨찾기 폴더 내 모든 .md 파일 frontmatter 파싱 → allTags 구축
- **persist hydration 대기**: 즐겨찾기 목록이 localStorage에서 복원된 후 스캔 실행

### 이미지 붙여넣기
- **저장 경로**: `{문서폴더}/.assets/{문서명}-{timestamp}-{4hex}.{ext}`
- **마크다운 저장 형식**: `<img src="./.assets/..." width="320" align="left">` (HTML 태그, 호환성 우선)
- **렌더링**: 상대경로 → `convertFileSrc()`로 asset URL 변환 → TipTap에서 표시
- **저장 시**: Turndown이 asset URL을 다시 상대경로로 복원 (`.assets` 패턴 매치)
- **크기 제어**: 붙여넣기 시 원본 < 320px면 원본, 아니면 320px 기본
- **삭제 정리**: 문서에서 이미지 삭제 → 파일은 유지 (undo 대응) → 앱 종료 시 미참조 이미지 휴지통으로
- **문서 삭제**: 해당 접두사 이미지 전부 휴지통
- **문서 이름변경**: 이미지 파일명 접두사 일괄 변경 + 마크다운 내 경로 업데이트

### 마크다운 변환
- **@tiptap/markdown** 공식 확장으로 교체 (기존 커스텀 markdown.ts 파서 대체)
- **파싱**: `editor.commands.setContent(md, { contentType: "markdown" })` — marked 기반
- **직렬화**: `editor.getMarkdown()` — TipTap 노드 → 마크다운 텍스트
- **커스텀 노드**: fileAttachment에 `renderMarkdown` 추가, 로드 시 `.assets/` 링크를 fileAttachment 노드로 후변환 (WIP)
- **코드블록**: CodeBlockLowlight + lowlight common 언어 + ReactNodeViewRenderer로 언어 선택 UI
- **기존 markdown.ts**: 아직 일부 유틸(extractAssetPaths 등)에서 사용, 점진적 제거 예정

### 파일 첨부
- **저장**: `.assets/` 폴더에 원본 파일명으로 복사 (`invoke("copy_file")`)
- **마크다운**: `[filename](./.assets/filename)` 표준 링크로 저장
- **에디터**: `FileAttachmentNode` 커스텀 블록 노드, ReactNodeViewRenderer로 카드 스타일 렌더링
- **타입별 아이콘**: PDF→FileText, Word→FilePen, Excel→FileSpreadsheet, PPT→Presentation, MD→BookOpen, ZIP→FileArchive, 기타→File
- **더블클릭**: 알려진 포맷 → `invoke("open_file")`, 나머지 → `invoke("open_in_explorer")`
- **에셋 라이프사이클**: 에디터에서 삭제/undo 시 `.trash/` ↔ `.assets/` 이동 (globalTrashMap으로 추적)
- **FileToolbar**: 첨부파일 선택 시 열기/위치열기/다른이름저장/복사/잘라내기/삭제

### 첨부파일 탭 (AttachmentExplorer)
- 검색탭 옆 고정 탭 (📎), 단축키 Ctrl+Shift+A
- 검색/분류(확장자별/편집일별/용량별)/즐겨찾기/모든파일 섹션
- 카드: inline-flex, 파일명 기준 폭, 즐겨찾기 별 + 클릭 시 컨텍스트 메뉴
- 앱 시작 시 전체 .md 파일 스캔 → allAttachments 구축
- 실시간 동기화: 에디터에서 첨부/삭제 시 allAttachments 즉시 업데이트

### 단축키
| 단축키 | 동작 |
|--------|------|
| Ctrl+1~4 | 제목 1~4 (토글) |
| Ctrl+5 | 일반 텍스트 |
| Ctrl+B/I | 굵게/기울임 (TipTap 내장) |
| Ctrl+Shift+X | 취소선 |
| Ctrl+S | 저장 |
| Ctrl+W | 탭 닫기 |
| Ctrl+N | 새 탭 |
| Ctrl+Tab / Ctrl+Shift+Tab | 다음/이전 탭 |
| Ctrl+Shift+F | 검색 탭 |
| Ctrl+Shift+A | 첨부파일 탭 |
| Tab / Shift+Tab | 코드블록 들여쓰기, 리스트 들여쓰기 |

### 설정 시스템
- **설정 패널**: 오른쪽 사이드 패널 (400px), 3탭 (설정/문서 스타일/줄 간격)
- **문서 스타일 탭**: 에디터 프리셋(컴팩트/기본/여유로운/커스텀) + 타이포그래피 슬라이더 + 레이아웃 + 코드블록
- **줄 간격 탭**: CSS 변수 기반 spacing (h1~h4/p/li/pre/bq/hr)
- **스페이싱 프리셋**: Default(간결) / General(넉넉) — App.tsx에서 CSS 변수로 적용
- **상태바**: 페이지 폭 모드/정렬/폭 텍스트 드롭다운 버튼

### FS 감시
- `useFsWatcher` 훅: tauri-plugin-fs `watch()` API로 즐겨찾기 폴더 실시간 감시
- 파일 생성/삭제/이름변경 → 500ms 디바운스 → `refreshFileTree()`
- Cargo.toml: `tauri-plugin-fs` features = ["watch"]

### 상태 persist
- **appStore**: favorites, favoriteFiles, favoriteAttachments, sidebarCollapsed, sidebarWidth, folderSort, fileSort, customFileOrder, expandedFolders, tabs, activeTabId
- **settingsStore**: settings (에디터 설정), themeMode, accentColor, tabSize, spacingStyle
- **expandedFolders**: Set → Array로 직렬화, 복원 시 Array → Set
- **tabs**: content 제외하고 저장, 앱 시작 시 파일에서 다시 읽기

### 드래그앤드롭 + Undo/Redo
- **Undo/Redo**: Command 패턴 (execute/undo), 최대 50개 히스토리 스택
- **Ctrl+Z/Ctrl+Shift+Z**: 에디터 포커스가 아닐 때 사이드바 undo/redo
- **앱 내 휴지통**: 삭제 시 `.trash/` 폴더로 이동, undo 가능, 앱 종료 시 OS 휴지통으로
- **최상위 폴더 순서 변경**: 마우스 드래그, FLIP 슬라이딩 애니메이션, undoable
- **파일/폴더 이동**: 드래그로 다른 폴더에 드롭, 폴더 영역 하이라이트, 고스트 행 복제
  - 이동 시 탭 경로, 즐겨찾기, 펼침 상태 자동 업데이트
  - 멀티 선택 이동 시 확인창
  - 중복 이름 자동 처리 (`이름 (1)`)
- **커스텀 파일 순서**: `folderSort === "custom"` 일 때 드래그로 순서 변경, persist
- **폴더 선택 시 하위 전체 하이라이트** (부모 경로 prefix 매칭)
- **드래그 중 hover 비활성화**: `data-dragging` 속성으로 제어

### 앱 종료 처리
- `event.preventDefault()`로 즉시 종료 방지
- 열린 탭의 고아 이미지 cleanup 실행
- `.trash/` 폴더 비우기 (OS 휴지통으로)
- 미저장 임시 문서 있으면 확인 다이얼로그
- cleanup 완료 후 `appWindow.destroy()`

## 파일 구조
```
src/
├── App.tsx                        — 메인 앱, 테마/스페이싱 CSS 적용, 파일+첨부파일 스캔, 종료 처리, 글로벌 단축키
├── hooks/
│   └── useFsWatcher.ts            — 즐겨찾기 폴더 FS 실시간 감시
├── stores/
│   ├── appStore.ts                — 파일/탭/즐겨찾기/태그/첨부파일/커스텀순서 상태
│   ├── undoStore.ts               — undo/redo 히스토리 스택
│   ├── settingsStore.ts           — 에디터/테마/스페이싱 설정
│   └── themeData.ts               — 테마 CSS 변수 정의
├── utils/
│   ├── frontmatter.ts             — frontmatter 파싱/직렬화, 태그 색상
│   ├── imageUtils.ts              — 이미지/파일 저장/정리/이름변경/삭제
│   ├── fileOps.ts                 — 파일 이동/되돌리기
│   ├── trashUtils.ts              — 앱 내 .trash 관리
│   └── pathUtils.ts               — 경로 유틸
├── components/
│   ├── editor/
│   │   ├── TiptapEditor.tsx       — 에디터 본체, @tiptap/markdown, 이미지 붙여넣기, 에셋 추적
│   │   ├── EditorArea.tsx         — 에디터 영역 + 상태바 + 탭 분기
│   │   ├── Toolbar.tsx            — 서식 툴바 + 표/이모지/첨부 버튼 + 저장 버튼
│   │   ├── TabBar.tsx             — 탭바 + 마우스 드래그 정렬 + 컨텍스트 메뉴
│   │   ├── TagExplorer.tsx        — 검색 탭
│   │   ├── AttachmentExplorer.tsx — 첨부파일 탭
│   │   ├── StatusBar.tsx          — 하단 상태바 + 페이지 폭/정렬 드롭다운
│   │   ├── ImageToolbar.tsx       — 이미지 플로팅 툴바 (크기/정렬/복사/잘라내기/삭제)
│   │   ├── TableToolbar.tsx       — 테이블 플로팅 툴바
│   │   ├── FileToolbar.tsx        — 첨부파일 플로팅 툴바
│   │   ├── FileAttachment.tsx     — 커스텀 fileAttachment 노드 + NodeView
│   │   ├── ImageExtension.ts      — 커스텀 Image 확장 (선택/화살키)
│   │   ├── CodeBlockView.tsx      — 코드블록 NodeView (언어 선택 드롭다운)
│   │   └── markdown.ts            — 레거시 마크다운 변환 (extractAssetPaths 등 유틸)
│   ├── sidebar/
│   │   ├── Sidebar.tsx            — 사이드바 + 폴더 관리 + 정렬
│   │   └── FileTree.tsx           — 폴더 트리 + 파일 관리 + 드래그 이동
│   ├── settings/
│   │   ├── SettingsPanel.tsx      — 설정 패널 (3탭: 설정/문서 스타일/줄 간격)
│   │   ├── StylePanel.tsx         — 줄 간격 슬라이더 컴포넌트
│   │   ├── FontPreview.tsx        — 폰트 미리보기
│   │   └── IconPicker.tsx         — 아이콘 선택기
│   └── ui/
│       ├── ContextMenu.tsx        — 우클릭 메뉴 (Portal)
│       ├── ConfirmDialog.tsx      — 확인 다이얼로그
│       ├── AnimatedCollapse.tsx   — 접기/펼치기 애니메이션
│       └── Tooltip.tsx            — 툴팁
```
