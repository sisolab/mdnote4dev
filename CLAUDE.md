# Marknote — Claude 프로젝트 가이드

## 프로젝트 개요
로컬 파일 기반 마��다운 WYSIWYG 데스크톱 노트 앱. Tauri v2 + React 19 + TipTap + @tiptap/markdown.

## 개발 환경
- 런타임: mise (node, rust)
- 패키지: pnpm (JS), cargo (Rust/Tauri)
- 빌드: Vite + Tauri

## 문서
| 문서 | 역할 |
|------|------|
| `docs/CONTEXT.md` | 설계 컨텍스트 (아키텍처, 핵심 로직, 파일 구조) |
| `docs/HOW IT WORKS-editor.md` | 에디터 설계 철학 (사람용) |
| `docs/HOW IT WORKS-sidebar.md` | 사이드바 설계 철학 (사람용) |
| `docs/REFERENCE-editor.md` | 에디터 코드 상세 (AI/개발자용) |
| `docs/REFERENCE-sidebar.md` | 사이드바 코드 상세 (AI/개발자용) |
| `docs/REFERENCE-state.md` | 상태/유틸/설정 코드 상세 (AI/개발자용) |

## 핵심 규칙
- 이미지 저장 시 반드시 상대경로 `./.assets/` 사용 (asset URL 금지)
- 폰트: Google Fonts CDN 동적 로드 (앱 번들에 포함하지 않음)
- ESC: 모든 팝업/다이얼로그에서 닫기 지원 필수
- closeTab: requestAnimationFrame으로 호출 (React 렌더링 충돌 방지)
