export type ThemeOptions = {
  isBlock: boolean;
  placeholder: string;
  onError?: (img: HTMLIFrameElement) => void;
  onLoad?: (img: HTMLIFrameElement) => void;
};

export type IframeOptions = {
  isBlock: boolean;
  placeholder: string;
  input: {
    placeholder: string;
    buttonText?: string;
  };
};
