import { Crepe } from '@milkdown/crepe';
import { listener } from '@milkdown/kit/plugin/listener';

import { getBlockEditConfig, getCodeMirrorConfig, getToolbarConfig } from './configs/crepeFeatures';
import { containerPlugin } from './plugins/plugin-container';
import { headingPlugin } from './plugins/plugin-heading';
import { configureColorPicker, highlightMarkerPlugin } from './plugins/plugin-highlight';
import { iframePlugin } from './plugins/plugin-iframe';

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
    featureConfigs: {
      [Crepe.Feature.BlockEdit]: getBlockEditConfig(),
      [Crepe.Feature.Toolbar]: getToolbarConfig(),
      [Crepe.Feature.CodeMirror]: getCodeMirrorConfig(isDarkMode),
      [Crepe.Feature.LinkTooltip]: {
        onCopyLink: () => {
          Toast('Link copied');
        },
      },
    },
  });

  crepe.editor
    .config((ctx) => {
      configureColorPicker(ctx);
    })
    .use(headingPlugin)
    .use(listener)
    .use(iframePlugin)
    .use(containerPlugin)
    .use(highlightMarkerPlugin);

  return crepe;
}
