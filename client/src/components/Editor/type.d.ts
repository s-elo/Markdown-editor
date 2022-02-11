export type EditorProps = {
  content: string;
  readonly: boolean;
  getContent: (content: string) => void;
};

export type ContentCacheType = {
  [key: string]: {
    savedContent: string;
    editedContent: string;
  };
};
