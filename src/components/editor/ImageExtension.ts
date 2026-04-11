import { Image } from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";

export const CustomImage = Image.extend({
  selectable: true,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("imageArrowSelect"),
        props: {
          handleKeyDown: (view, event) => {
            if (!event.shiftKey) return false;
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return false;

            const { state } = view;
            const { selection } = state;
            const isRight = event.key === "ArrowRight";

            // 현재 선택의 head 위치 (확장되는 쪽)
            const head = selection.head;
            const anchor = selection.anchor;

            if (isRight) {
              // head 위치 다음에 이미지가 있는지 확인
              const $pos = state.doc.resolve(head);
              const after = $pos.nodeAfter;
              if (after && after.type.name === "image") {
                // 이미지를 건너뛰어 선택 범위에 포함
                event.preventDefault();
                const newHead = head + after.nodeSize;
                view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, anchor, newHead)));
                return true;
              }
            } else {
              // 왼쪽: head 위치 이전에 이미지가 있는지
              const $pos = state.doc.resolve(head);
              const before = $pos.nodeBefore;
              if (before && before.type.name === "image") {
                event.preventDefault();
                const newHead = head - before.nodeSize;
                view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, anchor, newHead)));
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 320,
        parseHTML: (element) => {
          const w = element.getAttribute("data-width");
          return w ? parseInt(w, 10) : 120;
        },
        renderHTML: (attributes) => {
          return {
            "data-width": attributes.width,
            style: attributes.width > 0 ? `width: ${attributes.width}px; height: auto; cursor: pointer;` : "cursor: pointer;",
          };
        },
      },
      align: {
        default: "left",
        parseHTML: (element) => element.getAttribute("data-align") || "left",
        renderHTML: (attributes) => {
          return {
            "data-align": attributes.align,
            class: attributes.align === "center" ? "image-center" : "",
          };
        },
      },
    };
  },
});
