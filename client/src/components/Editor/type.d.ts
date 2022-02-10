export type EditorProps = {
  content: string;
  readonly: boolean;
  getContent: (content: string) => void;
};
