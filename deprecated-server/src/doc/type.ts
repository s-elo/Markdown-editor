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

export interface Settings {
  docRootPath: string;
  ignoreDirs?: string[];
  region?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  bucket?: string;
}

export interface Article {
  content: string;
  filePath: string;
  headings: string[];
  keywords: string[];
}
