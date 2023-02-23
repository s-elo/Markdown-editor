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
  {
    doc: DOC;
    parent: DOC | DOC[];
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
  modifyPath: string;
  newContent: string;
}

export interface CreateDocPayload {
  path: string;
  isFile: boolean;
}

export type DeleteDocPayload = CreateDocPayload;

export interface CopyCutDocPayload {
  copyCutPath: string;
  pastePath: string;
  isCopy: boolean;
  isFile: boolean;
}

export interface ModifyDocNamePayload {
  modifyPath: string;
  newName: string;
  isFile: boolean;
}
