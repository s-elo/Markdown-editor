import { Crepe } from '@milkdown/crepe';
import { commandsCtx } from '@milkdown/kit/core';
import { clearTextInCurrentBlockCommand, addBlockTypeCommand } from '@milkdown/kit/preset/commonmark';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';

import { iframeBlockSchema } from './plugins/plugin-iframe';

import Toast from '@/utils/Toast';

export function getCrepe({
  root,
  defaultValue,
  isDarkMode,
}: {
  root: HTMLElement;
  defaultValue: string;
  isDarkMode: boolean;
}) {
  const crepe = new Crepe({
    root,
    defaultValue,
    features: {
      // [Crepe.Feature.CodeMirror]: !readonly,
      // [Crepe.Feature.Latex]: false,
    },
    featureConfigs: {
      [Crepe.Feature.BlockEdit]: {
        buildMenu(builder) {
          builder.getGroup('advanced').addItem('Iframe', {
            icon: '<i class="pi pi-external-link"></i>',
            label: 'Iframe',
            onRun: (ctx) => {
              const commands = ctx.get(commandsCtx);
              const iframeBlock = iframeBlockSchema.type(ctx);
              commands.call(clearTextInCurrentBlockCommand.key);
              commands.call(addBlockTypeCommand.key, {
                nodeType: iframeBlock,
                attrs: { src: '' },
              });
            },
          });
        },
      },
      [Crepe.Feature.CodeMirror]: {
        theme: isDarkMode ? githubDark : githubLight,
        onCopy: () => Toast('Code copied', 'SUCCESS'),
      },
      [Crepe.Feature.LinkTooltip]: {
        onCopyLink: () => {
          Toast('Link copied', 'SUCCESS');
        },
      },
    },
  });

  return crepe;
}
