import { commandsCtx } from '@milkdown/kit/core';
import {
  addBlockTypeCommand,
  clearTextInCurrentBlockCommand,
  codeBlockSchema,
  isMarkSelectedCommand,
  wrapInBlockTypeCommand,
} from '@milkdown/kit/preset/commonmark';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import mermaid from 'mermaid';

import { ContainerType, containerSchema } from '../plugins/plugin-container';
import { highlightSchema, showColorPickerCommand } from '../plugins/plugin-highlight';
import { iframeBlockSchema } from '../plugins/plugin-iframe';
import { nextTick, uid } from '../utils';

import type { BlockEditFeatureConfig } from '@milkdown/crepe/feature/block-edit';
import type { CodeMirrorFeatureConfig } from '@milkdown/crepe/feature/code-mirror';
import type { ToolbarFeatureConfig } from '@milkdown/crepe/feature/toolbar';

export interface ConfigCallbacks {
  onToast?: (message: string) => void;
}

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

    const containerGroup = builder.addGroup('container', 'Container');
    Object.values(ContainerType).forEach((item) => {
      containerGroup.addItem(item, {
        icon: '<i class="pi pi-info-circle" style="color: var(--crepe-color-outline); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;"></i>',
        label: item.toUpperCase(),
        onRun: (ctx) => {
          const commands = ctx.get(commandsCtx);
          const container = containerSchema.type(ctx);
          commands.call(clearTextInCurrentBlockCommand.key);
          commands.call(wrapInBlockTypeCommand.key, {
            nodeType: container,
            attrs: { containerType: item },
          });
        },
      });
    });
  },
});

export const getCodeMirrorConfig = (isDarkMode: boolean, callbacks: ConfigCallbacks = {}): CodeMirrorFeatureConfig => {
  mermaid.initialize({ suppressErrorRendering: true, startOnLoad: false, theme: isDarkMode ? 'dark' : 'neutral' });

  return {
    theme: isDarkMode ? githubDark : githubLight,
    renderPreview: (language, content, applyPreview) => {
      if (language === 'mermaid' && content.trim()) {
        const container = document.createElement('div');
        const containerId = `mermaid-preview-container-${uid()}`;
        container.setAttribute('id', containerId);
        const placeholderDom = document.createElement('div');
        placeholderDom.setAttribute('style', 'width: 100%; height: 250px;');
        const placeholderDomId = `mermaid-preview-${uid()}`;
        placeholderDom.setAttribute('id', placeholderDomId);
        container.appendChild(placeholderDom);

        const renderMermaid = async () => {
          try {
            const { svg, bindFunctions } = await mermaid.render(placeholderDomId, content);
            applyPreview(container);
            nextTick(() => {
              const sanitizedContainer = document.getElementById(containerId);
              if (!sanitizedContainer) return;
              sanitizedContainer.innerHTML = svg;
              bindFunctions?.(sanitizedContainer);
            });
          } catch (error) {
            container.innerHTML = `<div class="mermaid-error"><p style="color: var(--crepe-color-error);">Error: ${
              (error as Error).message
            }</p></div>`;
          }
        };

        void renderMermaid();
        return;
      }
      return null;
    },
    onCopy: () => callbacks.onToast?.('Code copied'),
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
