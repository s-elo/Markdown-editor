import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

import './styles/index.scss';

export { editorViewCtx } from '@milkdown/kit/core';
export type { Ctx } from '@milkdown/kit/ctx';
export { outline } from '@milkdown/utils';
export { CrepeEditor } from './MilkdownEditor';
export type { CrepeEditorProps, CrepeEditorRef, EditorHeading } from './MilkdownEditor';
export { getCrepe } from './crepe';
export type { CrepeOptions } from './crepe';
export type { ImageUploadOptions, ImageUploader } from './configs/uploadConfig';
export { configureImageUploader, getImageUrl, uploadImage } from './configs/uploadConfig';
export {
  applyHighlightAndScroll,
  mountEditorAddons,
  removeEvents,
  searchAndHighlight,
  syncMirror,
} from './mountedAddons';
export { ColorPicker, Icon, TooltipInput } from './components';
export type { ColorPickerProps, ColorOptions, IconProps, TooltipInputProps } from './components';
export { getBlockEditConfig, getCodeMirrorConfig, getToolbarConfig } from './configs/crepeFeatures';
export { ContainerType, containerPlugin, containerSchema, wrapInContainerCommand } from './plugins/plugin-container';
export type { ContainerNodeAttrs } from './plugins/plugin-container';
export { Anchor, headingConfig, headingPlugin } from './plugins/plugin-heading';
export type { AnchorProps, HeadingConfig } from './plugins/plugin-heading';
export {
  configureColorPicker,
  colorOptionsConfig,
  highlightMarkerPlugin,
  highlightSchema,
  DEFAULT_COLOR,
} from './plugins/plugin-highlight';
export { iframeBlockSchema, iframePlugin } from './plugins/plugin-iframe';
export { defaultColorOptions } from './plugins/plugin-highlight';
