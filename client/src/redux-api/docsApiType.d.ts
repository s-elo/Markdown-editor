export interface DOC {
  name: string;
  id: string;
  isFile: boolean;
  children: DOC[];
  path: string[];
  headings: string[];
  keywords: string[];
}

export type NormalizedDoc = Record<
  string,
  Omit<DOC, 'children'> & {
    parentKey: string | null;
    childrenKeys: string[];
  }
>;
// export type NormalizedDoc = {
//   [path: string]: {
//     isFile: boolean;
//     siblings: string[];
//     children: string[];
//     name: string;
//     headings: string[];
//     keywords: string[];
//   };
// };

export interface DocItem {
  id: string;
  name: string;
  isFile: boolean;
  path: string[];
}

export type GetDocsType = DOC[];
// export type GetDocsType = {
//   docs: DOC[];
//   norDocs: normalizedDoc;
// };

export interface GetDocType {
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
