export type DOC = {
  dirName?: string;
  id?: string;
  isFile: boolean;
  children?: DOC[];
  path?: string[];
};
