export interface EditorProps {
  content: string;
  readonly: boolean;
  getContent: (content: string) => void;
}

export type ContentCacheType = Record<
  string,
  {
    savedContent: string;
    editedContent: string;
  }
>;
