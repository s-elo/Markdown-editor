import { Fields, Files } from 'formidable';

export interface DOC {
  name: string;
  id: string;
  isFile: boolean;
  children: DOC[];
  path: string[];
  headings: string[];
  keywords: string[];
}

export type GetDocType = Fields & {
  filePath: string;
};

export interface Article {
  content: string;
  filePath: string;
  headings: string[];
  keywords: string[];
}

export type CreateDocFields = Fields & {
  path: string;
  isFile: boolean;
};

export type DeleteDocFields = CreateDocFields;

export type CopyCutFields = Fields & {
  copyCutPath: string;
  pastePath: string;
  isCopy: boolean;
  isFile: boolean;
};

export type NormalizedDoc = Record<
  string,
  {
    doc: DOC;
    parent: DOC | DOC[];
  }
>;

type EditDocFields = Fields & {
  modifyPath: string;
  newContent: string;
};

type ModifyNameFields = Fields & {
  modifyPath: string;
  newName: string;
  isFile: boolean;
};

type CommitType = Fields & {
  title: string;
  body: string;
};
type StatusType = 'ADDED' | 'DELETED' | 'MODIFIED' | 'UNTRACKED';
interface Change {
  changePath: string;
  status: StatusType;
}
type GitRestoreType = Fields & {
  staged: boolean;
  changes: Change[];
};
type GitAddType = Fields & {
  changePaths: string[];
};

export interface ConfigType {
  docRootPath: string;
  ignoreDirs?: string[];
  region?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  bucket?: string;
}
export type UpdateConfigPayload = ConfigType;

export interface ImgDataType {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at: number;
  delete: string;
  filename: string;
  hash: string;
  height: number;
  page: string;
  path: string;
  size: number;
  storename: string;
  url: string;
  width: number;
}

export interface UploadImgHistoryType {
  currentPage: number;
  requestId: string;
  totalPages: number;
  code: string;
  data: ImgDataType[];
  message: string;
  success: boolean;
}

export type UploadFileType = Files & {
  imgFile: Files;
};

export type UploadParamType = Fields & {
  fileName: string;
};

export type DeleteImgType = Fields & {
  imgName: string;
};

export type RenameType = UploadParamType & {
  newName: string;
};
