/** Repository directory containing managed workspace images. */
export const WORKSPACE_ASSET_DIRECTORY = '_assets';

/** Root-relative path segment used to identify managed workspace images. */
export const WORKSPACE_ASSET_SEGMENT = `/${WORKSPACE_ASSET_DIRECTORY}/`;

/** CSS class applied while an asynchronous image URL is resolving. */
export const IMAGE_LOADING_CLASS = 'image-resolution-loading';

/** CSS class applied when an asynchronous image URL cannot be resolved or loaded. */
export const IMAGE_ERROR_CLASS = 'image-resolution-error';

/** Duration that an editor search result remains highlighted, in milliseconds. */
export const HIGHLIGHT_DURATION_MS = 3500;

/** Default background color used by the editor's highlight mark. */
export const DEFAULT_COLOR = '#ffff00';
