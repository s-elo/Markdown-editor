import { Fields } from "formidable";

export type DOC = {
  name: string;
  id: string;
  isFile: boolean;
  children: DOC[];
  path: string[];
  headings: string[];
  keywords: string[];
};

export type GetDocType = Fields & {
  filePath: string;
};

export type CreateDocFields = Fields & {
  path: string;
  isFile: boolean;
};

export type DeletDocFields = CreateDocFields;

export type CopyCutFields = Fields & {
  copyCutPath: string;
  pastePath: string;
  isCopy: boolean;
  isFile: boolean;
};

export type NormalizedDoc = {
  [path: string]: {
    doc: DOC;
    parent: DOC | DOC[];
  };
};

type EditDocFields = Fields & {
  modifyPath: string;
  newContent: string;
};

type ModifyNameFields = Fields & {
  modifyPath: string;
  newName: string;
  isFile: boolean;
};
