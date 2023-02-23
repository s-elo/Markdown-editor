export interface ThemeOptions {
  isBlock: boolean;
  placeholder: string;
  onError?: (img: HTMLIFrameElement) => void;
  onLoad?: (img: HTMLIFrameElement) => void;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type IframeOptions = {
  isBlock: boolean;
  placeholder: string;
  input: {
    placeholder: string;
    buttonText?: string;
  };
};
