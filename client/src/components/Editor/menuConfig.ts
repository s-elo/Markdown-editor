import { menu } from "@milkdown/plugin-menu";
// import {
//   EditorState,
//   MarkType,
//   liftListItem,
//   redo,
//   setBlockType,
//   sinkListItem,
//   TextSelection,
//   wrapIn,
// } from "@milkdown/prose";

// const hasMark = (state: EditorState, type: MarkType): boolean => {
//   if (!type) return false;
//   const { from, $from, to, empty } = state.selection;
//   if (empty) {
//     return !!type.isInSet(state.storedMarks || $from.marks());
//   }
//   return state.doc.rangeHasMark(from, to, type);
// };

export default menu({
  config: [
    [
      {
        type: "button",
        icon: "bulletList",
        key: "WrapInBulletList",
        // disabled: (view) => {
        //   const { state } = view;
        //   return !wrapIn(state.schema.nodes.bullet_list)(state);
        // },
      },
      {
        type: "button",
        icon: "orderedList",
        key: "WrapInOrderedList",
        // disabled: (view) => {
        //   const { state } = view;
        //   return !wrapIn(state.schema.nodes.ordered_list)(state);
        // },
      },
      {
        type: "button",
        icon: "taskList",
        key: "TurnIntoTaskList",
        // disabled: (view) => {
        //   const { state } = view;
        //   return !wrapIn(state.schema.nodes.task_list_item)(state);
        // },
      },
    ],
  ],
});
