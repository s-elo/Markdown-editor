export interface DocTreeNode {
  id: string;
  name: string;
  isFile: boolean;
  path: string[];
}

export interface Article {
  content: string;
  filePath: string;
  headings: string[];
  keywords: string[];
}

export interface UpdateDocPayload {
  filePath: string;
  content: string;
}

export interface CreateDocPayload {
  filePath: string;
  isFile: boolean;
}

export type DeleteDocPayload = CreateDocPayload[];

export type CopyCutDocPayload = {
  copyCutPath: string;
  pastePath: string;
  isCopy: boolean;
  isFile: boolean;
}[];

export interface ModifyDocNamePayload {
  filePath: string;
  name: string;
  isFile: boolean;
}

export interface CheckServerRes {
  version: string;
}
