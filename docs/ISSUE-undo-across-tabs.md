# 이슈: 탭 전환 후 에디터 Undo 보존

## 문제
문서 편집 → 다른 탭 → 돌아오기 → Ctrl+Z 하면 undo가 안 됨.
TipTap 에디터가 `key={activeTab.id}`로 완전 리마운트되면서 ProseMirror의 undo 히스토리가 리셋됨.

## 시도한 접근

### 1. EditorState 캐시 (실패)
- 방법: `editorStateCache = Map<tabId, EditorState>`, blur 시 저장, onCreate에서 복원
- 결과: `editor.view.updateState(cachedState)` 호출하면 빈 문서가 됨
- 원인: 새 에디터 인스턴스의 schema/plugin 구성과 캐시된 state가 호환되지 않음
- useEffect에서 requestAnimationFrame으로 지연 복원도 시도 → 동일하게 실패

### 2. 마크다운 스냅샷 스택 (부분 성공)
- 방법: `undoSnapshots = Map<tabId, string[]>` (최대 10개), 편집 시 2초 디바운스로 getMarkdown() 저장
- Ctrl+Z 시 TipTap 네이티브 undo가 비어있으면 스냅샷에서 복원
- **성공한 부분**: 스냅샷 저장/관리, Ctrl+Z 인터셉트, ProseMirror의 setContent undo 차단
- **실패한 부분**: `setContent(markdown, {contentType: "markdown"})` 호출 시 렌더링 깨짐
  - `commands.setContent()` 사용 → 렌더링 깨짐
  - `chain().setContent().focus().run()` 사용 → 렌더링 깨짐
  - 아마 contentType: "markdown" 옵션과 기존 에디터 상태 간 충돌

### 주요 기술적 어려움

1. **ProseMirror handleKeyDown vs window capture**: 
   - ProseMirror는 에디터 DOM에 직접 keydown 핸들러 등록
   - window capture phase로 먼저 잡아도, ProseMirror가 별도로 처리함
   - `handleKeyDown` editorProps에서 `return true`로 차단해야 함

2. **setContent와 undo 히스토리**:
   - `editor.commands.setContent()`를 호출하면 ProseMirror history에 "undoable action"으로 등록됨
   - 새 에디터에서 Ctrl+Z하면 이 setContent를 undo해서 빈 문서가 됨
   - `userEditCount` ref로 사용자 편집과 setContent를 구분해야 함

3. **activeTabId 타이밍**:
   - blur 이벤트 발생 시점에 `useAppStore.getState().activeTabId`가 이미 새 탭으로 변경됨
   - `mountedTabId = useRef(초기값)` 패턴으로 마운트 시 캡처 필요

4. **초기 스냅샷 타이밍**:
   - persist에서 복원된 탭은 `content: ""`로 시작
   - `restoreTabs`가 파일을 읽은 후에야 실제 content가 설정됨
   - 초기 스냅샷은 `onCreate`에서 `editor.getMarkdown()` 호출로 해결

## 현재 코드에 남아있는 것 (제거 필요)
- `undoSnapshots` Map, `UNDO_MAX` 상수
- `userEditCount` ref, `__userEditCount` view 속성
- `snapshotTimer` ref, snapshot 저장 useEffect
- Ctrl+Z capture handler useEffect
- handleKeyDown의 Ctrl+Z 차단 코드

## 다음에 시도할 수 있는 접근

1. **에디터 숨기기 방식**: `key` prop 제거, 모든 탭 에디터를 렌더링하고 `display: none`으로 숨기기. 메모리 사용 증가하지만 undo 완전 보존.

2. **ProseMirror history plugin 직접 접근**: history 플러그인의 내부 상태를 직접 추출/복원. `prosemirror-history` 소스 분석 필요.

3. **setContent 대신 transaction replay**: 스냅샷 대신 ProseMirror 트랜잭션(steps)을 저장하고, 새 에디터에서 replay. 문서 구조가 동일해야 함.

4. **Custom history plugin**: ProseMirror 기본 history 대신 커스텀 history 플러그인 작성. undo 항목을 외부 저장소에 보관.
