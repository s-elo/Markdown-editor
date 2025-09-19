import { BlockEditFeatureConfig } from '@milkdown/crepe/lib/types/feature/block-edit';
import { CodeMirrorFeatureConfig } from '@milkdown/crepe/lib/types/feature/code-mirror';
import { ToolbarFeatureConfig } from '@milkdown/crepe/lib/types/feature/toolbar';
import { commandsCtx } from '@milkdown/kit/core';
import {
  clearTextInCurrentBlockCommand,
  addBlockTypeCommand,
  isMarkSelectedCommand,
  codeBlockSchema,
} from '@milkdown/kit/preset/commonmark';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import mermaid from 'mermaid';

import { highlightSchema, showColorPickerCommand } from '../plugins/plugin-highlight';
import { iframeBlockSchema } from '../plugins/plugin-iframe';

import Toast from '@/utils/Toast';
import { nextTick, uid } from '@/utils/utils';

export const getBlockEditConfig = (): BlockEditFeatureConfig => ({
  buildMenu(builder) {
    const advancedGroup = builder.getGroup('advanced');

    advancedGroup.addItem('Iframe', {
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

    advancedGroup.addItem('Mermaid', {
      icon: '<i class="pi pi-slack" style="color: var(--crepe-color-outline); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;"></i>',
      label: 'Mermaid',
      onRun: (ctx) => {
        const commands = ctx.get(commandsCtx);
        const codeBlock = codeBlockSchema.type(ctx);

        commands.call(clearTextInCurrentBlockCommand.key);
        commands.call(addBlockTypeCommand.key, {
          nodeType: codeBlock,
          attrs: { language: 'mermaid' },
        });
      },
    });
  },
});

export const getCodeMirrorConfig = (isDarkMode: boolean): CodeMirrorFeatureConfig => {
  mermaid.initialize({ suppressErrorRendering: true, startOnLoad: false, theme: isDarkMode ? 'dark' : 'neutral' });

  return {
    theme: isDarkMode ? githubDark : githubLight,
    renderPreview: (language, content) => {
      if (language === 'mermaid' && content.trim()) {
        const container = document.createElement('div');
        const containerId = `mermaid-preview-container-${uid() as string}`;
        container.setAttribute('id', containerId);

        const placeholderDom = document.createElement('div');
        placeholderDom.setAttribute('style', 'width: 100%; height: 250px;');
        const placeholderDomId = `mermaid-preview-${uid() as string}`;
        placeholderDom.setAttribute('id', placeholderDomId);
        container.appendChild(placeholderDom);

        nextTick(async () => {
          const santifiedContainer = document.getElementById(containerId);
          if (!santifiedContainer) return;

          try {
            const { svg, bindFunctions } = await mermaid.render(placeholderDomId, content);

            santifiedContainer.innerHTML = svg;
            bindFunctions?.(santifiedContainer);
          } catch (e) {
            santifiedContainer.innerHTML = `<div class="mermaid-error"><p style="color: var(--crepe-color-error);">Error: ${
              (e as Error).message
            }</p></div>`;
          }
        });

        return container;
      }
      return null;
    },
    onCopy: () => Toast('Code copied', 'SUCCESS'),
  };
};

export const getToolbarConfig = (): ToolbarFeatureConfig => ({
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
});
