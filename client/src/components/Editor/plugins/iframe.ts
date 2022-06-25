import { RemarkPlugin } from "@milkdown/core";
import { AtomList, createNode } from "@milkdown/utils";
import { InputRule } from "prosemirror-inputrules";

import directive from "remark-directive";

const id = "iframe";
const iframe = createNode(() => ({
  id,
  schema: () => ({
    attrs: {
      src: { default: null },
    },
    group: "inline",
    inline: true,
    marks: "",
    atom: true,
    parseDOM: [
      {
        tag: "iframe",
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement)) {
            throw new Error();
          }
          return {
            src: dom.getAttribute("src"),
          };
        },
      },
    ],
    toDOM: (node) => ["iframe", { ...node.attrs, class: "iframe" }, 0],
    parseMarkdown: {
      match: (node) => {
        return node.type === "textDirective" && node.name === "iframe";
      },
      runner: (state, node, type) => {
        state.addNode(type, { src: (node.attributes as { src: string }).src });
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === id,
      runner: (state, node) => {
        state.addNode("textDirective", undefined, undefined, {
          name: "iframe",
          attributes: {
            src: node.attrs.src,
          },
        });
      },
    },
  }),
  inputRules: (nodeType) => [
    new InputRule(
      /:iframe\{src="(?<src>[^"]+)?"?\}/,
      (state, match, start, end) => {
        const [okay, src = ""] = match;
        const { tr } = state;
        if (okay) {
          tr.replaceWith(start, end, nodeType.create({ src }));
        }

        return tr;
      }
    ),
  ],
  remarkPlugins: () => [directive as RemarkPlugin],
}));

export default AtomList.create([iframe()]);
