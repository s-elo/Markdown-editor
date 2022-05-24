import { Fields, Files } from "formidable";

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

type CommitType = Fields & {
  message: string;
};

export type ConfigType = {
  docRootPath: string;
  ignoreDirs?: string[];
  imgStoreToken?: string;
  region?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  bucket?: string;
};

export type ImgDataType = {
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
};

export type UploadImgHistoryType = {
  CurrentPage: number;
  RequestId: string;
  TotalPages: number;
  code: string;
  data: ImgDataType[];
  message: string;
  success: boolean;
};

export type UploadType = Files & {
  imgFile: Files;
};
