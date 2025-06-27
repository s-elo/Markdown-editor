declare global {
  interface Window {
    createObjectURL: (imgFile: File) => string;
  }
}

export interface UnifyResponse<T> {
  data: T;
  code: number;
  message: string;
}
