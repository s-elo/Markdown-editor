/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/naming-convention */
declare global {
  interface Window {
    createObjectURL: (imgFile: File) => string;
  }

  // injected in build time
  var __GITHUB_PAGES_BASE_PATH__: string;
  var __VERSION__: string;
  var __SERVER_PORT__: string;
}

export interface UnifyResponse<T> {
  data: T;
  code: number;
  message: string;
}
