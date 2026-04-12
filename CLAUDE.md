# Marknote — Claude 프로젝트 가이드

## 프로젝트 개요
로컬 파일 기반 마크다운 WYSIWYG 데스크톱 노트 앱. Tauri v2 + React 19 + TipTap + @tiptap/markdown.

## 개발 환경
- 런타임: mise (node, rust)
- 패키지: pnpm (JS), cargo (Rust/Tauri)
- 빌드: Vite + Tauri

## 문서
| 문서 | 역할 |
|------|------|
| `docs/HOW IT WORKS.md` | 설계 철학, 동작 원리 (사람용) |
| `docs/REFERENCE.md` | 코드 상세, 파일 구조, API (AI/개발자용) |
| `docs/PLAN.md` | 개발 플랜, 완료 항목 |

## 핵심 규칙
- 이미지 저장 시 반드시 상대경로 `./.assets/` 사용 (asset URL 금지)
- asset URL regex에서 `%5C`/`%2F`는 통째로 매칭 (`[/\\%]` 아닌 `(?:[/\\]|%5C|%2F)`)
- 폰트: Google Fonts CDN 동적 로드 (앱 번들에 포함하지 않음)
- ESC: 모든 팝업/다이얼로그에서 닫기 지원 필수
- closeTab: requestAnimationFrame으로 호출 (React 렌더링 충돌 방지)
- StatusBar: IIFE 안에서 useState/useEffect 금지 (Hooks 규칙 위반)
- 탭 content 동기화: blur 이벤트 사용 (unmount cleanup은 editor 파괴 문제)
