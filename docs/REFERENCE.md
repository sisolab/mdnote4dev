# Marknote — Reference

> AI/개발자용. 코드 레벨 상세.
> 설계 철학은 → [HOW IT WORKS.md](./HOW%20IT%20WORKS.md)

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
│   │   ├── TabBar.tsx             — 탭바 + 드래그 정렬 + 탭 고정 + isDirty 닫기 확인
│   │   ├── TagExplorer.tsx        — 검색 탭
│   │   ├── AttachmentExplorer.tsx — 첨부파일 탭
│   │   ├── TabExplorer.tsx        — 열린 탭 탐색기 (특수탭)
│   │   ├── StatusBar.tsx          — 상태바 + 페이지 설정 드롭다운 + 탭 크기
│   │   ├── ImageToolbar.tsx       — 이미지 플로팅 툴바
│   │   ├── TableToolbar.tsx       — 테이블 플로팅 툴바 + 마크다운 복사
│   │   ├── FileToolbar.tsx        — 첨부파일 플로팅 툴바
│   │   ├── FileAttachment.tsx     — 커스텀 fileAttachment 노드 (괄호 URL 인코딩)
│   │   ├── ImageExtension.ts      — 커스텀 Image 확장 (width/align, renderMarkdown)
│   │   └── CodeBlockView.tsx      — 코드블록 NodeView (언어 선택)
│   ├── sidebar/
│   │   ├── Sidebar.tsx            — 사이드바 + 폴더 관리 + 정렬
│   │   └── FileTree.tsx           — 폴더 트리 + 파일 관리 + 드래그 이동
│   ├── settings/
│   │   ├── SettingsPanel.tsx      — 설정 패널 (4탭: 설정/스타일/디자인/글꼴)
│   │   ├── FontPreview.tsx        — 폰트 데이터 + Google Fonts 로드
│   │   └── IconPicker.tsx         — 아이콘 선택기
│   └── ui/
│       ├── ContextMenu.tsx        — 우클릭 메뉴
│       └── AnimatedCollapse.tsx   — 접기/펼치기 애니메이션
```

## 마크다운 저장 흐름

```
editor.getMarkdown()
→ asset URL 후처리: http://asset.localhost/.../.assets/file → ./.assets/file
  (regex: \.assets(?:[/\\]|%5C|%2F) — %5C/%2F를 통째로 매칭)
→ ImageExtension.renderMarkdown: <img src="" width="" align=""> HTML 태그
→ FileAttachment.renderMarkdown: [filename](path) — 괄호 %28/%29 인코딩
→ frontmatter 보존 (contentRef.current에서 raw 추출)
→ onSave(md) → writeTextFile
```

## 마크다운 로드 흐름

```
content → stripFrontmatter()
→ setContent(md, { contentType: "markdown" })
→ .assets/ 링크 → fileAttachment 노드 변환 (link mark + plain text 패턴 매칭)
→ 이미지 상대경로 → convertFileSrc() + ?t=timestamp 캐시 무효화
→ __initializing 플래그로 isDirty/이미지 오버레이 방지
```

## 탭 전환 시 content 동기화

```
editor "blur" 이벤트 → getMarkdown() → asset URL→상대경로 변환 → updateTabContent
(탭 전환 직전에 자동 발생, isDirty일 때만)
```

## 에셋 삭제/복원 (FileTree.tsx)

```
삭제:
  .assets/ 폴더에서 문서명 접두사(docName)로 파일 매칭
  → 각 에셋 moveToTrash → assetRecords에 기록
  → .md 파일 moveToTrash

복원 (undo):
  assetRecords 순서대로 restoreFromTrash
  → 부모 디렉토리 없으면 mkdir recursive
  → .md 파일 restoreFromTrash
  → readTextFile로 탭 열기
```

## 탭 관리 (appStore.ts)

```typescript
interface Tab {
  id: string; title: string; filePath: string | null;
  content: string; isDirty: boolean; pinned?: boolean;
  type?: "document" | "tag-explorer" | "attachment-explorer" | "tab-explorer";
}
```

| 함수 | 동작 |
|------|------|
| openTab | 탭 열기 + recentFiles 맨 앞 이동 |
| closeTab | 이전 탭 포커스, 마지막→검색탭, docTabs 기준 |
| pinTab | pinned=true + 고정탭 뒤로 이동 |
| unpinTab | pinned=false |

## 반응형 툴바 (Toolbar.tsx)

```
ResizeObserver로 컨테이너 폭 감시
→ >750px: 전체 표시
→ 650~750px: 리스트 버튼 숨김
→ 550~650px: 서식 버튼 추가 숨김
→ <550px: 제목 버튼 추가 숨김
```

## 상태바 드롭다운

| 버튼 | 섹션 제목 | 항목 |
|------|----------|------|
| 고정폭/가변폭 | 페이지 폭 방식 | 고정폭, 가변폭 |
| 가운데/왼쪽 | 페이지 정렬 | 가운데 정렬, 왼쪽 정렬 |
| 720px | 페이지 폭 | 480~840px |
| 탭 2 | 코드블록 탭 크기 | 스페이스 2칸, 스페이스 4칸 |

## 디자인 프리셋

CSS data-attribute 셀렉터로 적용:
```
data-design-h1="underline" → [data-design-h1="underline"] .tiptap h1 { border-bottom: ... }
```

| 요소 | 옵션 |
|------|------|
| H1 | default, underline, accent-left, gradient-line, thin-large |
| H2 | default, underline, accent-left, highlight, uppercase |
| H3 | default, accent-left, muted, badge, dotted |
| blockquote | default, background, quote-mark, serif |
| codeBlock | default, light, bordered, terminal, header |
| hr | default, dotted, dots |

## 단축키

| 단축키 | 동작 |
|--------|------|
| Ctrl+1~4 | 제목 1~4 (토글) |
| Ctrl+5 | 일반 텍스트 |
| Ctrl+B/I | 굵게/기울임 |
| Ctrl+Shift+X | 취소선 |
| Ctrl+S | 저장 |
| Ctrl+W | 탭 닫기 (pinned 보호, isDirty 경고) |
| Ctrl+N | 새 탭 |
| Ctrl+Tab / Ctrl+Shift+Tab | 다음/이전 탭 |
| Alt+1 | 검색 탭 |
| Alt+2 | 열린 탭 탐색기 |
| Alt+3 | 첨부파일 탭 |
| Tab / Shift+Tab | 코드블록 들여쓰기, 리스트 들여쓰기 |

## 앱 종료 처리

1. 미저장 문서 (isDirty 또는 임시+내용) → 확인 다이얼로그
2. 열린 탭의 고아 이미지 cleanup
3. `.trash/` 폴더 비우기 (OS 휴지통으로)
4. undo 히스토리 클리어
