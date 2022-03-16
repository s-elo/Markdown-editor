export type DOC = {
  dirName: string;
  id: string;
  isFile: boolean;
  children: DOC[];
  path: string[];
};

export type GetDocsType = DOC[];

export type GetDocType = {
  content: string;
  filePath: string;
};

export type UpdateDocPayload = {
  modifyPath: string;
  newContent: string;
};

export type CreateDocPayload = {
  path: string;
  isFile: boolean;
};

export type DeleteDocPayload = CreateDocPayload;

export type ModifyDocNamePayload = {
  modifyPath: string;
  newName: string;
  isFile: boolean;
};
