import { menu, menuPlugin } from '@milkdown/plugin-menu';

export default menu.configure(menuPlugin, {
  config: [
    [
      {
        type: 'button',
        icon: 'bulletList',
        key: 'WrapInBulletList',
      },
      {
        type: 'button',
        icon: 'orderedList',
        key: 'WrapInOrderedList',
      },
      {
        type: 'button',
        icon: 'taskList',
        key: 'TurnIntoTaskList',
      },
    ],
    [
      {
        type: 'button',
        icon: 'image',
        key: 'InsertImage',
      },
      {
        type: 'button',
        icon: 'table',
        key: 'InsertTable',
      },
      {
        type: 'button',
        icon: 'code',
        key: 'TurnIntoCodeFence',
      },
      {
        type: 'button',
        icon: 'quote',
        key: 'WrapInBlockquote',
      },
      {
        type: 'button',
        icon: 'link',
        key: 'InsertIframe',
      },
    ],
  ],
});
