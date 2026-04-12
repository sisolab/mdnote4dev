# Editor Module — Detail Reference

> AI/개발자용. 코드 레벨 상세.  
> 설계 철학은 → [manual-how_it_works-editor.md](./manual-how_it_works-editor.md)

## 파일 맵

| 파일 | 줄 | 역할 |
|------|------|------|
| `TiptapEditor.tsx` | 572 | 에디터 본체. 마크다운 로드/저장, 이미지 붙여넣기, 에셋 추적, Tab/단축키 |
| `EditorArea.tsx` | 191 | 에디터+상태바 래퍼. 탭 타입별 분기 (document/tag-explorer/attachment-explorer) |
| `Toolbar.tsx` | 452 | 서식 툴바. H1~H4, A(paragraph), 서식, 리스트, 인용문, 코드, 표, 이모지, 첨부, 저장 |
| `TabBar.tsx` | 719 | 탭바. 고정탭(검색/첨부), 드래그 순서변경, 컨��스트 메뉴, 이름변경, 스크롤 |
| `StatusBar.tsx` | 315 | 하단 상태바. 파일 정보, 태그 입력, 페이지 폭/정렬/모드 드롭다운 |
| `TagExplorer.tsx` | 284 | 검색 탭. 파일+내용 검색, 태그 필터 칩, 즐겨찾기, 최근문서 |
| `AttachmentExplorer.tsx` | 306 | 첨부파일 탭. 검색, 분류(확장자/날짜/용량), 즐겨찾기 |
| `ImageToolbar.tsx` | 172 | 이미지 선택 시 플로팅 툴바. 크기/정렬/복사/잘라내기/삭제 |
| `TableToolbar.tsx` | 80 | 표 선택 시 플로팅 툴바. 열/행 추가삭제, 복사/잘���내기/삭제 |
| `FileToolbar.tsx` | 115 | 첨부파일 선택 시 플로팅 툴바. 열기/저장/복사/잘라내기/삭제 |
| `FileAttachment.tsx` | 149 | 커스텀 fileAttachment 노드. NodeView 카드 UI, 타입별 아이콘 |
| `ImageExtension.ts` | 80 | 커스텀 Image 확장. selectable, 화살키 선택, width/align 속성 |
| `CodeBlockView.tsx` | 185 | 코드블록 NodeView. 언어 선택 드롭다운, 즐겨찾기 언어 |

## TiptapEditor.tsx — 핵심 로직

### 확장 등록 순서
```
StarterKit (heading 1-4, codeBlock:false, link:openOnClick:false)
→ CodeBlockLowlight (lowlight common, ReactNodeViewRenderer)
→ Placeholder
→ TaskList + TaskItem
→ Table + TableRow + TableCell + TableHeader
→ CustomImage
→ FileAttachmentNode
→ Typography
→ Markdown (@tiptap/markdown 공식)
```

### 마크다운 로드 흐름
```
content (마크다운 문자열)
→ stripFrontmatter() — frontmatter 제거
→ onCreate: editor.commands.setContent(md, { contentType: "markdown" })
→ @tiptap/markdown의 marked 파서가 HTML 변환
→ TipTap이 HTML → ProseMirror 문서
→ .assets/ 링크를 fileAttachment 노드로 후변환 (onCreate 내)
→ __initializing 플래그로 이미지 오버레이 방지
```

### 마크다운 저장 흐름
```
editor.getMarkdown()
→ @tiptap/markdown이 ProseMirror 문서 → 마크다운
→ fileAttachment: renderMarkdown()으로 [filename](path) 출력
→ parseFrontmatter(contentRef)로 frontmatter 보존
→ fm.raw + body 결합
→ onSave(md) → EditorArea.handleSave → writeTextFile
```

### 에셋 라이프사이클 (globalTrashMap)
```
편집 중 이미지/첨부 삭제:
  collectAssetPaths(prev) vs collectAssetPaths(current) 비교
  → 사라진 에셋: .assets/ → .trash/ (moveToTrash)
  → globalTrashMap에 {name → trashPath} 기록

Ctrl+Z undo:
  → 다시 나타난 에셋: globalTrashMap에서 trashPath 찾기
  → .trash/ → .assets/ (rename)
  → DOM img src 캐시 무효화 (setTimeout + ?t=timestamp)

globalTrashMap: 모듈 레벨 Map (탭 전환해도 유지)
```

### 이미지 붙여넣기
```
DOM paste 이벤트 (el.addEventListener)
→ clipboardData.items에서 image/* 필터
→ hasHtml이면 건너뛰기 (엑셀 등 복합 클립보드)
→ saveImageToAssets(docFilePath, blob)
→ convertFileSrc(absPath) → asset URL
→ tryInsert(): Image 로드 시도, 실패 시 200ms 간격 2회 재시도
→ naturalWidth < 320 → width: null (원본), 아니면 320
→ editor.chain().setImage({ src, width, align })
```

### Tab 키 처리 (handleKeyDown)
```
코드블록: tabSize 스페이스 삽입/제거 (useSettingsStore.getState().tabSize)
리스트: liftListItem/sinkListItem (ProseMirror schema-list)
그 외: preventDefault (포커스 이동 방지)
```

### 단축키 (handleKeyDown + App.tsx)
| 위치 | 단축키 | 동작 |
|------|--------|------|
| handleKeyDown | Ctrl+1~4 | toggleHeading / setParagraph |
| handleKeyDown | Ctrl+5 | setParagraph |
| handleKeyDown | Ctrl+Shift+X | toggleStrike |
| handleKeyDown | Tab/Shift+Tab | 코드블록 들여쓰기 / 리스트 들��쓰기 |
| TiptapEditor useEffect | Ctrl+S | handleSave + manual-save 이벤�� |
| App.tsx | Ctrl+W | closeTab |
| App.tsx | Ctrl+N | newTab |
| App.tsx | Ctrl+Tab/Shift+Tab | 탭 전환 |
| App.tsx | Ctrl+Shift+F | openTagExplorer |
| App.tsx | Ctrl+Shift+A | openAttachmentExplorer |
| App.tsx | Ctrl+Z/Shift+Z | 사이드바 undo/redo |

## FileAttachment.tsx — 커스텀 노드

### 노드 정의
```typescript
Node.create({
  name: "fileAttachment",
  group: "block",
  atom: true,
  selectable: true,
  attributes: { filename, filepath, relativePath, filesize },
  parseHTML: [{ tag: "file-attachment" }],
  renderHTML: ["file-attachment", mergeAttributes(...)],
  renderMarkdown: (node) => `[${filename}](${relativePath})\n\n`,
  addNodeView: ReactNodeViewRenderer(FileAttachmentView),
})
```

### 아이콘 매핑
| 확장자 | Lucide 아이콘 |
|--------|-------------|
| pdf | FileText |
| doc/docx | FilePen |
| xls/xlsx/csv | FileSpreadsheet |
| ppt/pptx | Presentation |
| md/markdown | BookOpen |
| zip/rar/7z | FileArchive |
| 기타 | File |

### 더블클릭 동작
```
OPENABLE_EXTS (pdf, docx, xlsx, pptx, txt, html, md, rtf 등)
→ invoke("open_file", { path }) — OS 기본앱
나머지 → invoke("open_in_explorer", { path: folder }) — 탐색기
```

## TabBar.tsx — 탭 관리

### 고정 탭
- tag-explorer: 검색 아이콘 (Search), 닫기 불��
- attachment-explorer: 클립 아��콘 (Paperclip), 닫기 불가
- 구분선 → 스크롤 가능 탭 영역

### 드래그 순서변경 (mouse event 기반)
```
onMouseDown → dragState 초기화 (startX, index)
mousemove → 5px 이상 이동 시 드래그 시작
  → scrollRef 내 탭 요소들의 getBoundingClientRect로 드롭 위치 감지
  → dragOverRef에 기록
mouseup → reorderTabs(from, to), cleanup
ESC → cleanup
```

### 컨텍스트 메뉴 (우클릭)
- 이름 바꾸기 (파일 탭만)
- 닫기
- 이 탭 외에 모두 닫기 (고정탭/임시탭 유지)

## StatusBar.tsx — 상태바

### 레이아웃
```
[파일경로] [폴더열기] | [크기] | [줄수] | [글자수] | [태그아이콘] [태그들...] [태그입력]
                                                     → 오른쪽: [고정폭] | [가운데] | [720px] | [숨기기]
```

### StatusDropdown 컴포넌트
- 클릭 → 위로 팝업 메뉴
- 항목에 Home 아이콘 (기본값 표시)
- 3개: 폭 모드 (고정/가변), 정렬 (가운데/왼쪽), 페이지 폭 (480/600/720/840)

## Toolbar.tsx — 서식 툴바

### 버튼 구성 (왼→오른)
```
[H1][H2][H3][H4][A] | [B][I][S][Code] | [UL][OL][Check] | [Quote][CodeBlock][HR] | [Table][Emoji][Attach]
→ 오른쪽: [Save] | [Star 즐겨찾기]
```

### 특수 버튼
- **TableGridButton**: hover로 6x6 그리드 팝업, 클릭으로 표 삽입
- **IconPickerButton**: hover로 이모지 팝업, 7섹션 (강조/상태/할일/정리/참고/반응/숫자)
- **Save**: isDirty일 때 빨간색, 저장 시 체크(초록) 0.8초 애니메이션
- **ToolbarDropdown**: 클릭 시 옵션 팝업 (아이콘+텍스트+기본값 Home 아이콘)
