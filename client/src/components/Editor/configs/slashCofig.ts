import {
  slashPlugin,
  slash,
  createDropdownItem,
} from "@milkdown/plugin-slash";
import { WrappedAction } from "@milkdown/plugin-slash/lib/item";
import { Ctx, themeManagerCtx, commandsCtx, schemaCtx } from "@milkdown/core";

const getActions = (ctx: Ctx, input = "/"): WrappedAction[] => {
  const { nodes } = ctx.get(schemaCtx);
  const actions: Array<
    WrappedAction & { keyword: string[]; typeName: string }
  > = [
    {
      id: "bulletList",
      dom: createDropdownItem(
        ctx.get(themeManagerCtx),
        "Bullet List",
        "bulletList"
      ),
      command: () => ctx.get(commandsCtx).call("WrapInBulletList"),
      keyword: ["bullet list", "ul"],
      typeName: "bullet_list",
    },
    {
      id: "orderedList",
      dom: createDropdownItem(
        ctx.get(themeManagerCtx),
        "Ordered List",
        "orderedList"
      ),
      command: () => ctx.get(commandsCtx).call("WrapInOrderedList"),
      keyword: ["ordered list", "ol"],
      typeName: "ordered_list",
    },
    {
      id: "taskList",
      dom: createDropdownItem(
        ctx.get(themeManagerCtx),
        "Task List",
        "taskList"
      ),
      command: () => ctx.get(commandsCtx).call("TurnIntoTaskList"),
      keyword: ["task list", "task"],
      typeName: "task_list_item",
    },
    {
      id: "image",
      dom: createDropdownItem(ctx.get(themeManagerCtx), "Image", "image"),
      command: () => ctx.get(commandsCtx).call("InsertImage"),
      keyword: ["image"],
      typeName: "image",
    },
    {
      id: "blockquote",
      dom: createDropdownItem(ctx.get(themeManagerCtx), "Quote", "quote"),
      command: () => ctx.get(commandsCtx).call("WrapInBlockquote"),
      keyword: ["quote", "blockquote"],
      typeName: "blockquote",
    },
    {
      id: "table",
      dom: createDropdownItem(ctx.get(themeManagerCtx), "Table", "table"),
      command: () => ctx.get(commandsCtx).call("InsertTable"),
      keyword: ["table"],
      typeName: "table",
    },
    {
      id: "code",
      dom: createDropdownItem(ctx.get(themeManagerCtx), "Code Fence", "code"),
      command: () => ctx.get(commandsCtx).call("TurnIntoCodeFence"),
      keyword: ["code"],
      typeName: "fence",
    },
    {
      id: "divider",
      dom: createDropdownItem(
        ctx.get(themeManagerCtx),
        "Divide Line",
        "divider"
      ),
      command: () => ctx.get(commandsCtx).call("InsertHr"),
      keyword: ["divider", "hr"],
      typeName: "hr",
    },
    {
      id: "iframe",
      dom: createDropdownItem(ctx.get(themeManagerCtx), "Iframe", "link"),
      command: () => ctx.get(commandsCtx).call("InsertIframe"),
      keyword: ["iframe"],
      typeName: "iframe",
    },
  ];

  const userInput = input.slice(1).toLocaleLowerCase();

  return actions
    .filter(
      (action) =>
        !!nodes[action.typeName] &&
        action.keyword.some((keyword) => keyword.includes(userInput))
    )
    .map(({ keyword, typeName, ...action }) => action);
};
export default slash.configure(slashPlugin, {
  config: (ctx) => {
    // Get default slash plugin items
    const actions = getActions(ctx);

    // Define a status builder
    return ({ isTopLevel, content, parentNode }) => {
      // You can only show something at root level
      if (!isTopLevel) return null;

      // Empty content ? Set your custom empty placeholder !
      if (!content) {
        return { placeholder: "Type / to use the slash commands..." };
      }

      // Define the placeholder & actions (dropdown items) you want to display depending on content
      if (content.startsWith("/")) {
        // Add some actions depending on your content's parent node
        // if (parentNode.type.name === "iframe") {
        // }

        return content === "/"
          ? {
              placeholder: "Type to search...",
              actions,
            }
          : {
              actions: getActions(ctx, content),
            };
      }
    };
  },
});
