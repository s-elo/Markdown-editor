export const APP_VERSION = __VERSION__;
/** /repo-name/ or / */
export const GITHUB_PAGES_BASE_PATH = __GITHUB_PAGES_BASE_PATH__;
/** 3024 or 7024*/
export const SERVER_PORT = __SERVER_PORT__;

export const ONLINE_MODE = Boolean(SERVER_PORT);

export const SERVER_BASE_URL = ONLINE_MODE ? `http://127.0.0.1:${SERVER_PORT}/api` : '/api';
