import { Image } from "@tiptap/extension-image";

export const CustomImage = Image.extend({
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
