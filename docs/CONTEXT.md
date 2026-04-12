# Marknote 설계 컨텍스트

## 앱 철학
- **"파일 자체에 데이터"** — 모든 문서는 표준 마크다운(.md), 메타데이터는 frontmatter
- 서비스 없이도 데이터는 온전히 사용자 소유
- 다른 마크다운 앱에서도 문서를 열 수 있어야 함
- 이미지/첨부 저장 시 상대경로 `./.assets/` 사용 (절대경로 변환 금지)

## 아키텍처 요약
- **Tauri v2** + React 19 + TypeScript + Vite + Tailwind CSS v4
- **TipTap** (ProseMirror) WYSIWYG 에디터 + @tiptap/markdown
- **Zustand** 상태 관리 (persist 미들웨어로 localStorage 저장)
- **Lucide React** 아이콘
- **Google Fonts CDN** 동적 폰트 로드 (오프라인 시 시스템 fallback)

## 레이아웃
- **사이드바**: 폴더 관리, 하단 액션바 (4버튼, space-evenly)
- **탭바**: 고정탭(검색/첨부) + 문서탭 + 우측 버튼(새탭/열기/설정/사이드바)
- **편집 영역**: 반응형 툴바 + WYSIWYG 에디터 + 하단 상태바
- **설정 패널**: 오른쪽 사이드 패널 (400px), 4탭 (설정/스타일/디자인/글꼴)

## 핵심 로직

### 마크다운 변환
- **@tiptap/markdown** 공식 확장
- **파싱**: `editor.commands.setContent(md, { contentType: "markdown" })`
- **직렬화**: `editor.getMarkdown()` → 후처리(asset URL→상대경로, width/align 보존)
- **이미지**: `<img src="./.assets/..." width="320" align="left">` HTML 태그로 저장 (속성 보존)
- **첨부파일**: `[filename](./.assets/filename)` 마크다운 링크로 저장, 로드 시 텍스트 패턴 매칭으로 fileAttachment 노드 변환
- **앵커 링크**: `[text](#heading-slug)` 클릭 시 heading 텍스트→slug 변환 후 스크롤

### 이미지 저장/로드 흐름
```
저장: editor.getMarkdown()
  → asset URL (http://asset.localhost/...) → ./.assets/filename 상대경로 변환
  → <img src="./.assets/..." width="320" align="left"> HTML 태그로 출력

로드: setContent(markdown)
  → @tiptap/markdown 파싱
  → DOM에서 img.src가 ./.assets/로 시작하면 convertFileSrc()로 asset URL 변환
```

### 저장 시스템
- **5가지 모드**: 수동(기본), 탭닫기 자동, 1분, 3분, 실시간
- 실시간: 500ms 디바운스, 저장 버튼 숨김
- 1분/3분: setInterval 기반
- 탭닫기/실시간: isDirty 탭 닫을 때 자동 저장 후 닫기
- 수동: isDirty 탭 닫을 때 확인 다이얼로그 (저장 후 닫기/저장 안 함/취소)

### 설정 시스템 (4탭)
- **설정 탭**: 테마(4종), 강조색(7색, 무지개순), 저장 모드
- **스타일 탭**: 전체 프리셋(컴팩트/기본/여유로운/저장 가능), 섹션별 프리셋, 커스텀 tick-dot 슬라이더
- **디자인 탭**: 요소별 스타일 프리셋 (H1-H3, 인용문, 코드블록, 수평선), 라이브 미리보기, 미리보기 문서 열기
- **글꼴 탭**: 언어별 본문 폰트 + 코드 폰트 선택, 클릭 즉시 적용, Google Fonts CDN

### 디자인 프리셋
| 요소 | 옵션 |
|------|------|
| H1 | 기본, 하단선, 강조선, 그라디언트, 강조 배경 |
| H2 | 기본, 하단선, 강조선, 형광펜, 배경 |
| H3 | 기본, 강조선, 연한 강조, 뱃지, 점선 밑줄 |
| 인용문 | 기본, 배경, 큰따옴표, 기울임 |
| 코드블록 | 다크, 라이트, 테두리, 터미널, 헤더 바 |
| 수평선 | 기본, 점선, 가운데 점 |

### 태그 시스템
- **저장**: 마크다운 frontmatter (`---\ntags: [tag1, tag2]\n---`)
- **색상**: 30색 고정 팔레트, 30개 초과 시 파스텔 톤 순환
- **스캔**: 앱 시작 시 즐겨찾기 폴더 내 모든 .md 파일 frontmatter 파싱

### 에셋 라이프사이클
- 편집 중 삭제: `.assets/` → `.trash/` (globalTrashMap 추적)
- Ctrl+Z undo: `.trash/` → `.assets/` 복원 + DOM src 캐시 무효화
- 앱 종료: `.trash/` → OS 휴지통
- 문서 삭제: 에셋 전부 `.trash/`로

### 창 크기 관리
- **동적 최소 크기**: `Math.max(720, sidebar + editorMaxWidth + 140)`
- **사이드바 토글**: 250ms ease-out 애니메이션으로 창 크기 조절
- **사이드바 접기**: 창 줄어듦, 펼치기: 창 넓어짐

### 반응형 툴바
- **750px+**: 전체 표시
- **650~750px**: 리스트 버튼 숨김
- **550~650px**: 서식 버튼 추가 숨김
- **550px 미만**: 제목 버튼 추가 숨김

### 탭 관리
- **닫기**: 이전 탭으로 포커스, 마지막 문서탭 닫으면 검색탭으로
- **isDirty 닫기**: requestAnimationFrame으로 closeTab 호출 (React 렌더링 충돌 방지)
- **외부 rename**: FS 감시로 파일 없어지면 같은 폴더에서 새 파일 탐색, 탭 경로 업데이트

### 상태바
```
[파일경로(축약)] [폴더열기] | [용량] | [태그들...] [태그입력]
                           → [고정폭▾] | [가운데▾] | [720px▾] | [탭2▾] | [숨기기]
```
- 각 드롭다운에 섹션 제목 (페이지 폭 방식, 페이지 정렬, 페이지 폭, 코드블록 탭 크기)

### 단축키
| 단축키 | 동작 |
|--------|------|
| Ctrl+1~4 | 제목 1~4 (토글) |
| Ctrl+5 | 일반 텍스트 |
| Ctrl+B/I | 굵게/기울임 |
| Ctrl+Shift+X | 취소선 |
| Ctrl+S | 저장 |
| Ctrl+W | 탭 닫기 (isDirty 경고) |
| Ctrl+N | 새 탭 |
| Ctrl+Tab / Ctrl+Shift+Tab | 다음/이전 탭 |
| Ctrl+Shift+F | 검색 탭 |
| Ctrl+Shift+A | 첨부파일 탭 |
| Tab / Shift+Tab | 코드블록 들여쓰기, 리스트 들여쓰기 |

### FS 감시
- `tauri-plugin-fs` watch API, 재귀적, 500ms 디바운스
- 파일 변경 → refreshFileTree + syncTabPaths (탭 경로 동기화)

### 앱 종료 처리
1. 미저장 문서 (isDirty 또는 임시+내용) → 확인 다이얼로그
2. 열린 탭 고아 이미지 cleanup
3. `.trash/` 폴더 비우기 (OS 휴지통으로)
4. undo 히스토리 클리어

## 파일 구조
```
src/
├── App.tsx                        — 메인 앱, 테마/스페이싱, 동적 창 크기, 종료 처리, 단축키
├── hooks/
│   └── useFsWatcher.ts            — FS 실시간 감시 + 탭 경로 동기화
├── stores/
│   ├── appStore.ts                — 파일/탭/즐겨찾기/태그/첨부파일/프리셋 상태
│   ├── undoStore.ts               — undo/redo 히스토리 스택
│   ├── settingsStore.ts           — 에디터/테마/스페이싱/디자인/저장모드/폰트 설정
│   └── themeData.ts               — 4개 테마 CSS 변수 정의
├── utils/
│   ├── frontmatter.ts             — frontmatter 파싱/직렬화, 태그 색상
│   ├── imageUtils.ts              — 이미지/파일 저장/정리/이름변경/삭제
│   ├── fileOps.ts                 — 파일 이동/되돌리기
│   ├── trashUtils.ts              — 앱 내 .trash 관리
│   └── pathUtils.ts               — 경로 유틸 (shortenPath)
├── components/
│   ├── editor/
│   │   ├── TiptapEditor.tsx       — 에디터 본체, 마크다운 로드/저장, 이미지/앵커/원문보기
│   │   ├── EditorArea.tsx         — 에디터 영역 + 상태바 + 탭 분기
│   │   ├── Toolbar.tsx            — 반응형 서식 툴바 + 원문보기/저장 버튼
│   │   ├── TabBar.tsx             — 탭바 + 드래그 정렬 + isDirty 닫기 확인
│   │   ├── TagExplorer.tsx        — 검색 탭
│   │   ├── AttachmentExplorer.tsx — 첨부파일 탭
│   │   ├── StatusBar.tsx          — 상태바 + 페이지 설정 드롭다운 + 탭 크기
│   │   ├── ImageToolbar.tsx       — 이미지 플로팅 툴바
│   │   ├── TableToolbar.tsx       — 테이블 플로팅 툴바
│   │   ├── FileToolbar.tsx        — 첨부파일 플로팅 툴바
│   │   ├── FileAttachment.tsx     — 커스텀 fileAttachment 노드
│   │   ├── ImageExtension.ts      — 커스텀 Image 확장 (width/align, renderMarkdown)
│   │   └── CodeBlockView.tsx      — 코드블록 NodeView (언어 선택)
│   ├── sidebar/
│   │   ├── Sidebar.tsx            — 사이드바 + 폴더 관리 + 정렬
│   │   └── FileTree.tsx           — 폴더 트리 + 파일 관리 + 드래그 이동
│   ├── settings/
│   │   ├── SettingsPanel.tsx      — 설정 패널 (4탭: 설정/스타일/디자인/글꼴)
│   │   ├── FontPreview.tsx        — 폰트 데이터 + Google Fonts 로드 (export)
│   │   └── IconPicker.tsx         — 아이콘 선택기
│   └── ui/
│       ├── ContextMenu.tsx        — 우클릭 메뉴
│       └── AnimatedCollapse.tsx   — 접기/펼치기 애니메이션
```
