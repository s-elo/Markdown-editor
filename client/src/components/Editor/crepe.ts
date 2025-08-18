import { Crepe } from '@milkdown/crepe';
import { commandsCtx } from '@milkdown/kit/core';
import { listener } from '@milkdown/kit/plugin/listener';
import {
  clearTextInCurrentBlockCommand,
  addBlockTypeCommand,
  isMarkSelectedCommand,
} from '@milkdown/kit/preset/commonmark';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';

import {
  configureColorPicker,
  highlightMarkerPlugin,
  highlightSchema,
  showColorPickerCommand,
} from './plugins/plugin-highlight';
import { iframePlugin, iframeBlockSchema } from './plugins/plugin-iframe';

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
            icon: '<i class="pi pi-external-link" style="color: var(--crepe-color-outline); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;"></i>',
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
      [Crepe.Feature.Toolbar]: {
        buildToolbar(builder) {
          builder.getGroup('formatting').addItem('highlighter', {
            icon: '<i class="pi pi-palette" style="color: var(--crepe-color-outline)"></i>',
            active: (ctx) => {
              const commands = ctx.get(commandsCtx);
              return commands.call(isMarkSelectedCommand.key, highlightSchema.type(ctx));
            },
            onRun: (ctx) => {
              const commands = ctx.get(commandsCtx);
              commands.call(showColorPickerCommand.key);
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

  crepe.editor.config(configureColorPicker).use(listener).use(iframePlugin).use(highlightMarkerPlugin);

  return crepe;
}
