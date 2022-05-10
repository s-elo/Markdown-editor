export type DOC = {
  name: string;
  id: string;
  isFile: boolean;
  children: DOC[];
  path: string[];
  headings: string[];
  keywords: string[];
};

export type normalizedDoc = {
  [path: string]: {
    isFile: boolean;
    siblings: string[];
    children: string[];
    name: string;
    headings: string[];
    keywords: string[];
  };
};

export type GetDocsType = {
  docs: DOC[];
  norDocs: normalizedDoc;
};

export type GetDocType = {
  content: string;
  filePath: string;
  headings: string[];
  keywords: string[];
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

export type CopyCutDocPayload = {
  copyCutPath: string;
  pastePath: string;
  isCopy: boolean;
  isFile: boolean;
};

export type ModifyDocNamePayload = {
  modifyPath: string;
  newName: string;
  isFile: boolean;
};
