/** Application version injected by the build configuration. */
export const APP_VERSION = __VERSION__;

/** GitHub Pages base path, such as `/repo-name/` or `/`. */
export const GITHUB_PAGES_BASE_PATH = __GITHUB_PAGES_BASE_PATH__;

/** Local server port injected by the build; falsy for the hosted online build. */
export const SERVER_PORT = __SERVER_PORT__;

/** Whether the client is connected to the bundled local server. */
export const ONLINE_MODE = Boolean(SERVER_PORT);

/** Base URL used for requests to the local Markdown Editor API. */
export const SERVER_BASE_URL = ONLINE_MODE ? `http://127.0.0.1:${SERVER_PORT}/api` : '/api';

/** Directories excluded from GitHub workspace document discovery by default. */
export const DEFAULT_IGNORE_DIRS = ['imgs', 'node_modules', 'dist'];

/** IndexedDB database containing persisted GitHub workspace state. */
export const GITHUB_WORKSPACE_DATABASE_NAME = 'markdown-editor-github-workspaces';

/** IndexedDB object store containing version-one GitHub workspace records. */
export const GITHUB_WORKSPACE_STORE_NAME = 'workspaces-v1';

/** Repository-relative file used to persist workspace settings. */
export const WORKSPACE_SETTINGS_PATH = '.workspace-settings.json';

/** Local-storage key containing the active workspace mode. */
export const WORKSPACE_MODE_STORAGE_KEY = 'workspace-mode';

/** Local-storage key containing the selected GitHub workspace configuration. */
export const GITHUB_WORKSPACE_CONFIG_STORAGE_KEY = 'github-workspace-config';

/** Maximum size GitHub accepts for a regular repository file: 100 MiB. */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers
export const GITHUB_MAX_REPOSITORY_FILE_SIZE_BYTES = 100 * 1024 * 1024;

/** Image file extensions supported by GitHub workspace upload and management. */
export const GITHUB_SUPPORTED_IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  'avif',
  'bmp',
  'gif',
  'ico',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
]);
