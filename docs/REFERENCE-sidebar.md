# Sidebar Module — Detail Reference

> AI/개발자용. 코드 레벨 상세.  
> 설계 철학은 → [manual-how_it_works-sidebar.md](./manual-how_it_works-sidebar.md)

## 파일 맵

| 파일 | 줄 | 역할 |
|------|------|------|
| `Sidebar.tsx` | 775 | 사이드바 본체. 즐겨찾기 관리, 폴더 드래그 정렬, 별명/아이콘 커스텀, 리사이즈 |
| `FileTree.tsx` | 1076 | 파일 트리. 정렬, 검색, 드래그 이동, 멀티선택, 이름변경, 삭제, 복제 |

## Sidebar.tsx — 즐겨찾기 & 레이아웃

### UI 레이아웃
```
[Documents 헤더] (접기/펼치기)
├── 즐겨찾기 폴더 1 [▶ 아이콘 이름(개수)] [새파일] [새폴더]
│   └── <FileTree rootPath={path} />
│   ── 구분선 ──
├── 즐겨찾기 폴더 2 ...
│   └── <FileTree />
└── ── 하단 액션바 ──
    [전체접기] [컴팩트] [정렬] [폴더추가]
── 리사이즈 핸들 (오른쪽 가장자리) ──
```

### 즐겨찾기 폴더 드래그 정렬 (mouse event)
```
startFavDrag(e, idx):
  dragFavState ref 초기화 (startX, startY, fromIdx)
  document.addEventListener("mousemove", "mouseup")

mousemove:
  5px 이상 이동 → 드래그 시작, 고스트 생성
  → updateFavDragTarget(e, favIdx): getBoundingClientRect로 above/below 판별
  → dragFavFrom, dropTarget state 업데이트

mouseup:
  reorderFavorites(from, to) — appStore
  FLIP 애니메이션 (favFlipPositions ref)
  cleanup (고스트 제거, 이벤트 해제)
```

### FLIP 애니메이션 패턴
```
1. 스냅샷: favFlipPositions.current에 각 요소 getBoundingClientRect 저장
2. 상태 변경: reorderFavorites()로 순서 바꿈
3. 다음 프레임: 새 위치 측정, 이전 위치와 deltaY 계산
4. transform: translateY(deltaY) → transition → translateY(0)
```

### 리사이즈
```
handleMouseDown on resize handle:
  isResizing = true
  document mousemove → setSidebarWidth(clamp(180, 500))
  document mouseup → cleanup
```

### 컨텍스트 메뉴 항목
| 폴더 상태 | 메뉴 |
|-----------|------|
| 정상 | 새 문서, 새 폴더, 탐색기에서 열기, 이름 변경, 별명 설정, 아이콘 변경, 즐겨찾기 해제 |
| 깨진 경로 | 다시 연결, 즐겨찾기 해제 |

### 하단 액션바 (4버튼)
| 버튼 | 동작 |
|------|------|
| ChevronsUpDown | 전체 접기/펼치기 토글 |
| LayoutList / LayoutGrid | 컴팩트 모드 토글 |
| ArrowUpDown | 정렬 메뉴 (이름순/날짜순/커스텀) |
| FolderPlus | 폴더 추가 (OS 다이얼로그) |

### 별명 & 아이콘
```
별명 (alias):
  더블클릭 or 컨텍스트 메뉴 "별명 설정"
  → aliasEditing state → input 표시
  → Enter: setFavoriteAlias(path, value)
  → Escape: 취소

아이콘:
  컨텍스트 메뉴 "아이콘 변경" → IconPicker 모달
  → setFavoriteIcon(path, iconName)
  → Lucide 아이콘 동적 렌더링
```

### 깨진 폴더 처리
```
useEffect → checkFolders():
  favorites.forEach(f => exists(f.path))
  → 없으면 brokenPaths Set에 추가
  → 깨진 폴더: 빨간 텍스트, "다시 연결" 메뉴
  → handleRelink: OS 다이얼로그 → updateFavoritePath()
```

## FileTree.tsx — 파일 관리

### 디렉토리 로딩 & 정렬
```
loadDirectory(path):
  readDir(path) → FileEntry[] 생성
  정렬 우선순위:
    1. 디렉토리 먼저 (isDirectory DESC)
    2. 정렬 모드별:
       - "name": localeCompare (한국어 자연정렬)
       - "date": mtime DESC (최신순)
       - "custom": customFileOrder[folderPath] 순서, 없으면 끝에
  숨김 파일 제외 (이름이 "."으로 시작)
```

### 검색
```
filterTree(path, query):
  재귀 탐색: 모든 하위 파일/폴더
  query.toLowerCase() 포함 여부 확인
  매칭 파일 + 부모 폴더 반환 (경로 유지)
```

### 멀티 선택
```
클릭:
  일반 클릭 → clearSelected + select(path)
  Ctrl+클릭 → toggleSelectedPath(path)
  Shift+클릭 → lastClickedPath~현재 path 범위 선택

lastClickedPath ref로 Shift 범위 기준점 추적
selectedPaths Set (appStore)
```

### 파일/폴더 드래그 이동 (mouse event)
```
startItemDrag(e, entry):
  dragMoveState ref 초기화
  멀티선택 → 선택된 항목 전부 이동
  단일 → 해당 entry만

mousemove:
  5px threshold → 드래그 시작
  고스트 생성 (멀티일 때 카운트 뱃지)
  elementFromPoint → 드롭 대상 폴더 감지
  같은 폴더 내 → reorder (above/below 감지)
  다른 폴더 → move 하이라이트

mouseup:
  같은 폴더: reorder → setCustomFileOrder, FLIP 애니메이션
  다른 폴더: doMove(paths, targetFolder)
```

### 파일 이동 (doMove)
```
doMove(paths, target):
  moveItems(paths, target) — fileOps.ts
  → 중복 이름 → "(1)", "(2)" 자동 추가
  → expandedFolders 업데이트
  → 열린 탭 filePath 업데이트
  → 즐겨찾기 경로 업데이트

  커스텀 정렬 → setCustomFileOrder 업데이트
  executeUndoable: undo → undoMoveItems(oldPaths, newPaths)
```

### 이름 변경 (finishRename)
```
finishRename(entry):
  유효성 검사: 빈 이름, 같은 이름
  rename(oldPath, newPath) — Tauri fs

  마크다운 파일:
    → renameDocImages(docDir, oldName, newName, markdown)
    → 이미지 파일명 접두사 변경 + 마크다운 내 경로 업데이트
    → writeTextFile로 저장

  → 열린 탭: updateTabTitle, updateTabFilePath
  → 즐겨찾기: 경로 업데이트
  → executeUndoable: undo → rename back + 이미지 복원
```

### 삭제 (handleDelete)
```
handleDelete(items):
  ConfirmDialog 표시

  파일 삭제:
    마크다운 → readTextFile → extractAssetPaths
    → 에셋들 moveToTrash(favoriteRoot)
    → 파일 자체 moveToTrash(favoriteRoot)
  폴더 삭제:
    → moveToTrash(favoriteRoot)

  → 관련 탭 닫기
  → refreshFileTree

  executeUndoable:
    undo → restoreFromTrash (에셋 + 파일 순서대로 복원)
```

### 컨텍스트 메뉴 항목
| 대상 | 메뉴 |
|------|------|
| 단일 파일 | 열기, 이름 변경, 복제, 즐겨찾기 추가/해제, 삭제 |
| 단일 폴더 | 새 문서, 새 폴더, 이름 변경, 삭제 |
| 멀티 선택 | 삭제 (N개 항목) |

### FileTreeItem 컴포넌트 (재귀)
```
<FileTreeItem entry depth>
  [들여쓰기] [▶ 폴더아이콘/파일아이콘] [이름] [★즐겨찾기]
  ├── 폴더: AnimatedCollapse → children.map(FileTreeItem)
  └── 파일: 클릭→openTab, 더블클릭→openTab

  이름변경 모드: input 오버레이
  드래그: onMouseDown → startItemDrag
  스타일: hover 하이라이트, selected 배경, focus 좌측 바
```

### 슬라이딩 하이라이트
```
containerRef에 mousemove 리스너
→ 가장 가까운 [data-tree-item] 요소 감지
→ highlight 요소의 top/height를 대상 요소 위치로 이동
→ CSS transition으로 부드럽게 따라다님
→ mouseleave → opacity: 0
```

### 삽입 애니메이션
```
insertAnimPaths ref에 새 파일/폴더 경로 기록
→ DOM 렌더 후 해당 요소에 scale(0.95) → scale(1) 애니메이션
→ 완료 후 ref 비움
```
