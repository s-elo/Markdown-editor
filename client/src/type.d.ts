declare global {
  interface Window {
    createObjectURL: (imgFile: File) => string;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention, no-var
  var __GITHUB_PAGES_BASE_PATH__: string;
}

export interface UnifyResponse<T> {
  data: T;
  code: number;
  message: string;
}
