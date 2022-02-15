export type DOC = {
  dirName: string;
  id: string;
  isFile: boolean;
  children: DOC[];
  path: string[];
};

export type GetDocsType = DOC[];

export type UpdateDocPayload = {
  modifyPath: string;
  newContent: string;
}