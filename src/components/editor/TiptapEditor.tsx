import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { liftListItem, sinkListItem } from "@tiptap/pm/schema-list";
import { CodeBlockView } from "./CodeBlockView";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { CustomImage } from "./ImageExtension";
import { FileAttachmentNode } from "./FileAttachment";
import { Typography } from "@tiptap/extension-typography";
import { useEffect, useCallback, useRef, useState } from "react";
import { Markdown } from "@tiptap/markdown";
import { parseFrontmatter } from "@/utils/frontmatter";
import { saveImageToAssets, getAssetsDir } from "@/utils/imageUtils";
import { moveToTrash, findFavoriteRoot } from "@/utils/trashUtils";
import { rename, exists, stat } from "@tauri-apps/plugin-fs";
import { useAppStore } from "@/stores/appStore";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Toolbar } from "./Toolbar";
import { ImageToolbar } from "./ImageToolbar";
import { TableToolbar } from "./TableToolbar";
import { FileToolbar } from "./FileToolbar";
import { useSettingsStore, getFontFamily, getCodeFontFamily } from "@/stores/settingsStore";

interface TiptapEditorProps {
  content: string;
  filePath: string | null;
  onSave: (markdown: string) => void;
}

// 모듈 레벨: 탭 전환/리마운트해도 유지
const globalTrashMap = new Map<string, string>(); // assetName → trashPath

function stripFrontmatter(md: string): string {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

export function TiptapEditor({ content, filePath, onSave }: TiptapEditorProps) {
  const lastMarkdown = useRef(content);
  const contentRef = useRef(content);
  contentRef.current = content;
  const { settings, showSettings, codeFontFamily } = useSettingsStore();

  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false, // CodeBlockLowlight로 대체
        link: {
          openOnClick: false,
          HTMLAttributes: { class: "tiptap-link" },
        },
      }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView);
        },
      }).configure({
        lowlight: createLowlight(common),
        defaultLanguage: null,
        HTMLAttributes: { class: "code-block" },
      }),
      Placeholder.configure({
        placeholder: "",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      CustomImage,
      FileAttachmentNode,
      Typography,
      Markdown,
    ],
    content: { type: "doc", content: [] }, // 초기 빈 문서, onCreate에서 마크다운 로드
    editorProps: {
      attributes: {
        class: "outline-none prose prose-sm max-w-none",
      },
      handleClick: (view, _pos, event) => {
        const link = (event.target as HTMLElement).closest("a[href]");
        if (!link) return false;
        const href = link.getAttribute("href") ?? "";
        if (!href.startsWith("#")) return false;
        event.preventDefault();
        const slug = decodeURIComponent(href.substring(1));
        const toSlug = (text: string) => text.toLowerCase().replace(/[^\w가-힣\s-]/g, "").replace(/\s+/g, "-").replace(/-+$/, "");
        const headings = view.dom.querySelectorAll("h1,h2,h3,h4");
        for (const h of headings) {
          if (toSlug(h.textContent ?? "") === slug) {
            h.scrollIntoView({ behavior: "smooth", block: "start" });
            return true;
          }
        }
        return true;
      },
      handleKeyDown: (view, event) => {
        // Ctrl+1~5: 제목/일반텍스트
        if (event.ctrlKey && !event.altKey && !event.shiftKey && ["1","2","3","4","5"].includes(event.key)) {
          event.preventDefault();
          const num = parseInt(event.key);
          if (num >= 1 && num <= 4) {
            const heading = view.state.schema.nodes.heading;
            const { $from } = view.state.selection;
            const isActive = $from.parent.type === heading && $from.parent.attrs.level === num;
            if (isActive) {
              // 토글: 이미 같은 제목이면 paragraph로
              const paragraph = view.state.schema.nodes.paragraph;
              view.dispatch(view.state.tr.setBlockType($from.before($from.depth), $from.after($from.depth), paragraph));
            } else {
              view.dispatch(view.state.tr.setBlockType($from.before($from.depth), $from.after($from.depth), heading, { level: num }));
            }
          } else {
            // Ctrl+5: 일반 텍스트
            const paragraph = view.state.schema.nodes.paragraph;
            const { $from } = view.state.selection;
            view.dispatch(view.state.tr.setBlockType($from.before($from.depth), $from.after($from.depth), paragraph));
          }
          return true;
        }


        // Ctrl+Shift+X: 취소선
        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "x") {
          event.preventDefault();
          const mark = view.state.schema.marks.strike;
          if (mark) {
            const { from, to } = view.state.selection;
            if (view.state.doc.rangeHasMark(from, to, mark)) {
              view.dispatch(view.state.tr.removeMark(from, to, mark));
            } else {
              view.dispatch(view.state.tr.addMark(from, to, mark.create()));
            }
          }
          return true;
        }

        if (event.key !== "Tab") return false;
        event.preventDefault();
        const state = view.state;
        const { $from } = state.selection;

        // 코드블록: tabSize에 따라 스페이스 삽입
        if ($from.parent.type.name === "codeBlock") {
          const tabSize = useSettingsStore.getState().tabSize;
          const indent = " ".repeat(tabSize);
          if (event.shiftKey) {
            const lineStart = state.doc.resolve($from.start());
            const text = state.doc.textBetween(lineStart.pos, $from.pos);
            if (text.startsWith(indent)) {
              view.dispatch(state.tr.delete(lineStart.pos, lineStart.pos + tabSize));
            }
          } else {
            view.dispatch(state.tr.insertText(indent));
          }
          return true;
        }

        // 리스트: 들여쓰기/내어쓰기
        for (let d = $from.depth; d > 0; d--) {
          const name = $from.node(d).type.name;
          if (name === "listItem" || name === "taskItem") {
            const nodeType = state.schema.nodes[name];
            if (event.shiftKey) {
              liftListItem(nodeType)(state, view.dispatch);
            } else {
              sinkListItem(nodeType)(state, view.dispatch);
            }
            return true;
          }
        }

        return true;
      },
    },
    onCreate: ({ editor: e }) => {
      (e as any).__initializing = true;
      e.commands.setContent(stripFrontmatter(content), { contentType: "markdown" } as any);
      // .assets/ 링크를 fileAttachment 노드로 변환 (이미지 제외)
      const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|svg)$/i;
      const replacements: { from: number; to: number; href: string; text: string }[] = [];
      const seen = new Set<number>();
      // .assets/ 링크 패턴을 텍스트에서 직접 매칭 (link mark 또는 plain text 모두 대응)
      const ASSET_LINK_RE = /^\[([^\]]+)\]\((\.[/\\]\.assets\/[^)]+)\)$/;
      e.state.doc.descendants((node, pos) => {
        // 방법 1: link mark가 있는 경우
        if (node.isText) {
          const linkMark = node.marks.find((m) => m.type.name === "link");
          if (linkMark) {
            const href = linkMark.attrs.href as string;
            if (href?.includes(".assets/") && !IMAGE_EXTS.test(href)) {
              const $pos = e.state.doc.resolve(pos);
              const parentPos = $pos.before($pos.depth);
              if (!seen.has(parentPos)) {
                seen.add(parentPos);
                replacements.push({ from: parentPos, to: parentPos + $pos.parent.nodeSize, href, text: node.text ?? "" });
              }
            }
            return;
          }
        }
        // 방법 2: plain text로 남은 경우 ([filename](./.assets/...))
        if (node.isText && node.text) {
          const match = node.text.match(ASSET_LINK_RE);
          if (match && !IMAGE_EXTS.test(match[2])) {
            const $pos = e.state.doc.resolve(pos);
            const parentPos = $pos.before($pos.depth);
            if (!seen.has(parentPos)) {
              seen.add(parentPos);
              replacements.push({ from: parentPos, to: parentPos + $pos.parent.nodeSize, href: match[2], text: match[1] });
            }
          }
        }
      });
      if (replacements.length > 0) {
        const tr = e.state.tr;
        for (let i = replacements.length - 1; i >= 0; i--) {
          const { from, to, href, text } = replacements[i];
          const filename = decodeURIComponent(href.split("/").pop() ?? text ?? "file");
          let fp = href;
          if (filePath && href.startsWith("./")) {
            const docDir = filePath.substring(0, filePath.lastIndexOf("\\"));
            fp = `${docDir}\\${decodeURIComponent(href.substring(2)).replace(/\//g, "\\")}`;
          }
          const attachmentNode = e.schema.nodes.fileAttachment?.create({
            filename, filepath: fp, relativePath: href, filesize: 0,
          });
          if (attachmentNode) {
            tr.replaceWith(from, to, attachmentNode);
          }
        }
        e.view.dispatch(tr);
        // 변환으로 인한 isDirty 방지
        setTimeout(() => {
          const store = useAppStore.getState();
          const tab = store.tabs.find((t) => t.id === store.activeTabId);
          if (tab) store.markTabClean(tab.id);
        }, 50);
      }
      // 이미지 상대경로 → asset URL 변환 (Tauri에서 상대경로 렌더링 불가)
      if (filePath) {
        const docDir = filePath.substring(0, filePath.lastIndexOf("\\"));
        e.view.dom.querySelectorAll("img").forEach((img) => {
          const src = img.getAttribute("src") ?? "";
          if (src.startsWith("./") && src.includes(".assets")) {
            const absPath = `${docDir}\\${src.substring(2).replace(/\//g, "\\")}`;
            img.setAttribute("src", convertFileSrc(absPath));
          }
        });
      }
      requestAnimationFrame(() => { (e as any).__initializing = false; });
    },
    onTransaction: ({ editor: e }) => {
      setTick((t) => t + 1);
      // 링크에 title 속성 추가 (URL 툴팁)
      e.view.dom.querySelectorAll("a[href]").forEach((a) => {
        if (!a.getAttribute("title")) {
          a.setAttribute("title", a.getAttribute("href") ?? "");
        }
      });
      // 범위 선택에 포함된 이미지 하이라이트
      if ((e as any).__initializing) return;
      const imgs = e.view.dom.querySelectorAll("img");
      const { from, to } = e.state.selection;
      const isRange = to - from > 1;
      if (!isRange) {
        // 선택 범위 없으면 모든 하이라이트 제거
        imgs.forEach((img) => img.classList.remove("in-selection"));
      } else {
        imgs.forEach((img) => {
          try {
            const pos = e.view.posAtDOM(img, 0);
            if (pos > from && pos < to) {
              img.classList.add("in-selection");
            } else {
              img.classList.remove("in-selection");
            }
          } catch {
            img.classList.remove("in-selection");
          }
        });
      }
    },
  });

  // 툴바 active 상태 즉시 반영용
  const [, setTick] = useState(0);


  // 이미지 붙여넣기 핸들러
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom;
    const handler = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      // HTML 데이터가 있으면 이미지 붙여넣기 건너뛰기 (엑셀 등 복합 클립보드)
      const hasHtml = Array.from(items).some((item) => item.type === "text/html");
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/") && !hasHtml) {
          e.preventDefault();
          e.stopPropagation();
          const blob = item.getAsFile();
          if (!blob) return;
          const fp = filePathRef.current;
          if (!fp) {
            // 미저장 문서 — 이미지 붙여넣기 무시
            return;
          }
          try {
            const relativePath = await saveImageToAssets(fp, blob);
            const docDir = fp.substring(0, fp.lastIndexOf("\\"));
            const absPath = `${docDir}\\${relativePath.substring(2).replace(/\//g, "\\")}`;
            const assetUrl = convertFileSrc(absPath);
            // 이미지 로드 확인 후 삽입 (로드 실패 시 재시도)
            const tryInsert = (url: string, retries = 2): Promise<void> => new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                const width = img.naturalWidth > 0 && img.naturalWidth < 320 ? null : 320;
                editor.chain().focus().setImage({ src: url, width, align: "left" } as any).run();
                resolve();
              };
              img.onerror = () => {
                if (retries > 0) {
                  setTimeout(() => tryInsert(url, retries - 1).then(resolve), 200);
                } else {
                  // 최종 실패해도 삽입
                  editor.chain().focus().setImage({ src: url, width: 320, align: "left" } as any).run();
                  resolve();
                }
              };
              img.src = url;
            });
            await tryInsert(assetUrl);
          } catch {}
          return;
        }
      }
    };
    el.addEventListener("paste", handler);
    return () => el.removeEventListener("paste", handler);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (content !== lastMarkdown.current) {
      lastMarkdown.current = content;
      editor.commands.setContent(stripFrontmatter(content), { contentType: "markdown" } as any);
    }
  }, [content, editor]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    let body = editor.getMarkdown();
    // asset URL → 상대경로 복원 (http://asset.localhost/.../.assets/file → ./.assets/file)
    body = body.replace(/http:\/\/asset\.localhost\/[^)"\s]*?\.assets[/\\%]([^)"\s?]+)(?:\?[^)"\s]*)?/gi,
      (_match, filename) => `./.assets/${decodeURIComponent(filename)}`
    );
    // frontmatter 보존: 현재 탭 content에서 frontmatter를 그대로 유지
    const fm = parseFrontmatter(contentRef.current);
    const md = fm.raw ? `---\n${fm.raw}\n---\n${body}` : body;
    lastMarkdown.current = md;
    onSave(md);
  }, [editor, onSave, content]);

  // 에셋(이미지/첨부파일) 삭제/복원 추적
  const prevAssetsRef = useRef<Set<string>>(new Set());

  const collectAssetPaths = useCallback((doc: any): Set<string> => {
    const paths = new Set<string>();
    doc.descendants((node: any) => {
      if (node.type.name === "image") {
        const src = node.attrs.src as string;
        const match = src.match(/\.assets(?:[/\\]|%5C|%2F)(.+?)(?:\?.*)?$/i);
        if (match) paths.add(decodeURIComponent(match[1]));
      }
      if (node.type.name === "fileAttachment") {
        const rp = node.attrs.relativePath as string;
        if (rp) {
          const name = rp.replace(/^\.\/\.assets\//, "");
          paths.add(name);
        }
      }
    });
    return paths;
  }, []);

  useEffect(() => {
    if (!editor) return;
    // 초기 에셋 목록
    prevAssetsRef.current = collectAssetPaths(editor.state.doc);

    const handler = async () => {
      const fp = filePathRef.current;
      if (!fp) return;
      const current = collectAssetPaths(editor.state.doc);
      const prev = prevAssetsRef.current;
      const assetsDir = getAssetsDir(fp);
      const favorites = useAppStore.getState().favorites;
      const favRoot = findFavoriteRoot(fp, favorites);

      // 삭제된 에셋: prev에 있었는데 current에 없는 것
      for (const name of prev) {
        if (!current.has(name)) {
          const assetPath = `${assetsDir}\\${name}`;
          try {
            if (favRoot && await exists(assetPath)) {
              const result = await moveToTrash(assetPath, favRoot);
              globalTrashMap.set(name, result.trashPath);
            }
          } catch {}
        }
      }

      // 복원된 에셋: current에 있는데 prev에 없는 것 (undo)
      let restored = false;
      for (const name of current) {
        if (!prev.has(name)) {
          const trashPath = globalTrashMap.get(name);
          const assetPath = `${assetsDir}\\${name}`;
          if (trashPath) {
            try {
              if (await exists(trashPath)) {
                await rename(trashPath, assetPath);
                restored = true;
              }
              globalTrashMap.delete(name);
            } catch {}
          }
        }
      }

      // 파일 복원 후 이미지 리로드 (DOM 직접 조작, undo 히스토리에 영향 없음)
      if (restored) {
        setTimeout(() => {
          editor.view.dom.querySelectorAll("img").forEach((img) => {
            const src = img.getAttribute("src") ?? "";
            if (src.includes(".assets")) {
              const clean = src.replace(/\?t=\d+$/, "");
              img.setAttribute("src", clean + `?t=${Date.now()}`);
            }
          });
        }, 50);
      }

      // 첨부파일 탭 실시간 반영
      const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|svg)$/i;
      const store = useAppStore.getState();
      const docPath = fp;

      // 삭제된 첨부파일 제거
      for (const name of prev) {
        if (!current.has(name) && !IMAGE_EXTS.test(name)) {
          const absPath = `${assetsDir}\\${name}`;
          store.setAllAttachments(store.allAttachments.filter((a) => !(a.absPath === absPath && a.docPath === docPath)));
        }
      }

      // 복원/추가된 첨부파일 추가
      for (const name of current) {
        if (!prev.has(name) && !IMAGE_EXTS.test(name)) {
          const absPath = `${assetsDir}\\${name}`;
          const already = store.allAttachments.some((a) => a.absPath === absPath && a.docPath === docPath);
          if (!already) {
            const ext = name.includes(".") ? name.substring(name.lastIndexOf(".") + 1).toLowerCase() : "";
            let size = 0;
            try { const s = await stat(absPath); size = s.size; } catch {}
            store.setAllAttachments([...store.allAttachments, { filename: name, absPath, relativePath: `./.assets/${name}`, docPath, size, mtime: Date.now(), ext }]);
          }
        }
      }

      prevAssetsRef.current = current;
    };

    editor.on("update", handler);
    return () => { editor.off("update", handler); };
  }, [editor, collectAssetPaths]);

  // 편집 시 isDirty 표시 (초기화 중에는 무시)
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if ((editor as any).__initializing) return;
      const store = useAppStore.getState();
      const tab = store.tabs.find((t) => t.id === store.activeTabId);
      if (tab && !tab.isDirty) {
        store.updateTabContent(tab.id, tab.content);
      }
    };
    editor.on("update", handler);
    return () => { editor.off("update", handler); };
  }, [editor]);

  // 자동 저장 (saveMode에 따라 동작)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => {
    if (!editor) return;
    const saveMode = useSettingsStore.getState().saveMode;

    // realtime: 편집할 때마다 500ms 디바운스 저장
    if (saveMode === "realtime") {
      const handler = () => {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          handleSave();
          window.dispatchEvent(new CustomEvent("manual-save"));
        }, 500);
      };
      editor.on("update", handler);
      return () => { editor.off("update", handler); clearTimeout(saveTimer.current); };
    }

    // 1min / 3min: 인터벌 저장
    if (saveMode === "1min" || saveMode === "3min") {
      const ms = saveMode === "1min" ? 60_000 : 180_000;
      intervalRef.current = setInterval(() => {
        const store = useAppStore.getState();
        const tab = store.tabs.find((t) => t.id === store.activeTabId);
        if (tab?.isDirty && tab.filePath) {
          handleSave();
          window.dispatchEvent(new CustomEvent("manual-save"));
        }
      }, ms);
      return () => clearInterval(intervalRef.current);
    }

    // manual / on-tab-close: 자동 저장 없음
    return;
  }, [editor, handleSave]);

  // Ctrl+S 즉시 저장도 유지
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
        window.dispatchEvent(new CustomEvent("manual-save"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  if (!editor) return null;

  const s = settings;
  const scale = s.headingScale;

  const editorStyle = {
    "--editor-font-size": `${s.fontSize}px`,
    "--editor-line-height": `${s.lineHeight}`,
    "--editor-font-family": getFontFamily(s.fontFamily),
    "--editor-letter-spacing": `${s.letterSpacing}px`,
    "--editor-code-font-size": `${s.codeFontSize}px`,
    "--editor-code-line-height": `${s.codeLineHeight}`,
    "--editor-code-padding": `${s.codePadding}px`,
    "--editor-h1-size": `${s.fontSize * scale * scale * scale}px`,
    "--editor-h2-size": `${s.fontSize * scale * scale}px`,
    "--editor-h3-size": `${s.fontSize * scale}px`,
    "--editor-h4-size": `${s.fontSize * 1.05}px`,
    "--editor-code-font-family": getCodeFontFamily(codeFontFamily),
  } as React.CSSProperties;

  return (
    <div className="flex flex-col h-full">
      <Toolbar editor={editor} />
      <ImageToolbar editor={editor} />
      <TableToolbar editor={editor} />
      <FileToolbar editor={editor} />
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ padding: "24px 48px", cursor: "text" }}
        onMouseDown={(e) => {
          // 에디터 내부 콘텐츠가 아닌 빈 영역 클릭 시 클릭 위치에 가장 가까운 곳에 포커스
          if (e.target === e.currentTarget || !(e.target as HTMLElement).closest(".tiptap")) {
            e.preventDefault();
            const editorRect = editor.view.dom.getBoundingClientRect();
            const isLeft = e.clientX < editorRect.left;
            const isRight = e.clientX > editorRect.right;
            // 좌우 바깥이면 X를 에디터 안쪽 끝으로 보정해서 해당 줄의 맨앞/맨뒤로
            const x = isLeft ? editorRect.left + 1 : isRight ? editorRect.right - 1 : e.clientX;
            const pos = editor.view.posAtCoords({ left: x, top: e.clientY });
            if (pos) {
              editor.commands.focus();
              if (isLeft || isRight) {
                const resolvePos = pos.inside >= 0 ? pos.inside : pos.pos;
                const resolved = editor.state.doc.resolve(resolvePos);

                // 현재 위치의 노드가 이미지인지 확인
                const nodeAt = editor.state.doc.nodeAt(resolvePos);
                const nodeBefore = resolved.nodeBefore;

                if (isLeft && (nodeAt?.type.name === "image" || nodeBefore?.type.name === "image")) {
                  // 왼쪽 클릭 + 이미지 → 이전 블록의 끝으로
                  const blockStart = resolved.before(Math.max(resolved.depth, 1));
                  if (blockStart > 0) {
                    const prevEnd = blockStart - 1;
                    const prevResolved = editor.state.doc.resolve(prevEnd);
                    editor.commands.setTextSelection(prevResolved.end(prevResolved.depth));
                  } else {
                    editor.commands.setTextSelection(resolvePos);
                  }
                } else {
                  // 텍스트 블록을 찾아 올라감
                  let depth = resolved.depth;
                  while (depth > 0 && !resolved.node(depth).isTextblock) depth--;
                  if (depth > 0) {
                    const start = resolved.start(depth);
                    const end = resolved.end(depth);
                    editor.commands.setTextSelection(isLeft ? start : end);
                  } else {
                    editor.commands.setTextSelection(isLeft ? resolvePos : resolvePos + 1);
                  }
                }
              } else {
                editor.commands.setTextSelection(pos.pos);
              }
            } else {
              editor.commands.focus("end");
            }
          }
        }}
      >
        <div style={{
          ...(s.widthMode === "fixed"
            ? { width: `${s.editorMaxWidth}px`, minWidth: `${s.editorMaxWidth}px`, margin: (s.pageAlign === "center" && !showSettings) ? "0 auto" : undefined }
            : { width: "100%" }),
          ...editorStyle,
        }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
