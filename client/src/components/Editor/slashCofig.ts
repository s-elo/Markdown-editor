import {
  slashPlugin,
  slash,
  // createDropdownItem,
  defaultActions,
} from "@milkdown/plugin-slash";
// import { themeToolCtx, commandsCtx, schemaCtx } from "@milkdown/core";

export default slash.configure(slashPlugin, {
  config: (ctx) => {
    // Get default slash plugin items
    const actions = defaultActions(ctx);

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
        // if (parentNode.type.name === "table") {
        //   actions.push({
        //     id: "table",
        //     dom: createDropdownItem(ctx.get(themeToolCtx), "Custom", "h1"),
        //     command: () =>
        //     //   ctx.get(commandsCtx).call(/* Add custom command here */),
        //     ctx.get(commandsCtx).callByName('InsertTable')
        //     keyword: ["table"],
        //     enable: () => true,
        //   });
        // }

        return content === "/"
          ? {
              placeholder: "Type to search...",
              actions,
            }
          : {
              actions: defaultActions(ctx, content),
            };
      }
    };
  },
});
