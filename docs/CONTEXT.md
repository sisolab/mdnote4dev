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

### 마크다운 변환 (markdown.ts)
- **markdownToHtml**: HTML 태그 보호 → 마크다운 파싱 → placeholder 복원 → 이미지 경로 변환
- **htmlToMarkdown**: Turndown으로 변환 (체크박스, 이미지, 테이블 커스텀 규칙)
- **HTML 블록 보호**: `<img>` 등 HTML 태그를 placeholder로 치환 후 마크다운 regex 실행, 이후 복원
- **테이블**: Turndown table 규칙이 DOM에서 직접 마크다운 생성 (querySelectorAll)

### 상태 persist
- **appStore**: favorites, favoriteFiles, sidebarCollapsed, folderSort, fileSort, expandedFolders, tabs, activeTabId
- **settingsStore**: settings (에디터 설정), themeMode, accentColor
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
├── App.tsx                    — 메인 앱, 테마 적용, 파일 스캔, 종료 처리
├── stores/
│   ├── appStore.ts            — 파일/탭/즐겨찾기/태그/커스텀순서 상태
│   ├── undoStore.ts           — undo/redo 히스토리 스택
│   ├── settingsStore.ts       — 에디터/테마 설정
│   └── themeData.ts           — 테마 CSS 변수 정의
├── utils/
│   ├── frontmatter.ts         — frontmatter 파싱/직렬화, 태그 색상
│   ├── imageUtils.ts          — 이미지 저장/정리/이름변경/삭제
│   ├── fileOps.ts             — 파일 이동/되돌리기 (경로/탭/즐겨찾기 업데이트)
│   ├── trashUtils.ts          — 앱 내 .trash 관리 (이동/복원/비우기)
│   └── pathUtils.ts           — 경로 유틸 (shortenPath 등)
├── components/
│   ├── editor/
│   │   ├── TiptapEditor.tsx   — 에디터 본체, 이미지 붙여넣기
│   │   ├── EditorArea.tsx     — 에디터 영역 + 상태바 + 태그 관리
│   │   ├── Toolbar.tsx        — 서식 툴바 + 표 그리드 팝업
│   │   ├── TabBar.tsx         — 탭바 + 드래그 정렬
│   │   ├── TagExplorer.tsx    — 검색 탭 (검색/태그/즐겨찾기/최근문서)
│   │   ├── StatusBar.tsx      — 하단 상태바
│   │   ├── ImageToolbar.tsx   — 이미지 플로팅 툴바
│   │   ├── TableToolbar.tsx   — 테이블 플로팅 툴바
│   │   ├── ImageExtension.ts  — TipTap 커스텀 Image 확장
│   │   └── markdown.ts        — 마크다운 ↔ HTML 변환
│   ├── sidebar/
│   │   ├── Sidebar.tsx        — 사이드바 + 폴더 관리
│   │   └── FileTree.tsx       — 폴더 트리 + 파일 관리
│   ├── settings/
│   │   └── SettingsPanel.tsx  — 설정 패널
│   └── ui/
│       ├── ContextMenu.tsx    — 우클릭 메뉴
│       ├── ConfirmDialog.tsx  — 확인 다이얼로그
│       └── Tooltip.tsx        — 툴팁
```
