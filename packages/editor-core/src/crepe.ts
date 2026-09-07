import { Crepe } from '@milkdown/crepe';
import { listener } from '@milkdown/kit/plugin/listener';
import { upload } from '@milkdown/kit/plugin/upload';

import {
  getBlockEditConfig,
  getCodeMirrorConfig,
  getToolbarConfig,
  type ConfigCallbacks,
} from './configs/crepeFeatures';
import {
  configureImageUploader,
  uploadImage as defaultUploadImage,
  type ImageUploadOptions,
} from './configs/uploadConfig';
import { containerPlugin } from './plugins/plugin-container';
import { headingPlugin } from './plugins/plugin-heading';
import { configureColorPicker, highlightMarkerPlugin } from './plugins/plugin-highlight';
import { iframePlugin } from './plugins/plugin-iframe';

export interface CrepeOptions extends ConfigCallbacks, ImageUploadOptions {
  root: HTMLElement;
  defaultValue: string;
  isDarkMode: boolean;
}

export function getCrepe({ root, defaultValue, isDarkMode, onToast, uploadImage, getImageUrl }: CrepeOptions) {
  const imageUploader = uploadImage ?? defaultUploadImage;
  const imageUrlResolver = getImageUrl ?? ((url: string) => url);
  const crepe = new Crepe({
    root,
    defaultValue,
    featureConfigs: {
      [Crepe.Feature.BlockEdit]: getBlockEditConfig(),
      [Crepe.Feature.Toolbar]: getToolbarConfig(),
      [Crepe.Feature.CodeMirror]: getCodeMirrorConfig(isDarkMode, { onToast }),
      [Crepe.Feature.LinkTooltip]: { onCopyLink: () => onToast?.('Link copied') },
      [Crepe.Feature.ImageBlock]: { proxyDomURL: imageUrlResolver, onUpload: imageUploader },
    },
  });
  crepe.editor
    .config((ctx) => {
      configureColorPicker(ctx);
      configureImageUploader(ctx, { uploadImage: imageUploader, getImageUrl: imageUrlResolver });
    })
    .use(upload)
    .use(headingPlugin)
    .use(listener)
    .use(iframePlugin)
    .use(containerPlugin)
    .use(highlightMarkerPlugin);
  return crepe;
}
