import path from 'path';

import fs from 'fs-extra';
import shell from 'shelljs';
import simpleGit, { SimpleGit } from 'simple-git';

import { DOC, NormalizedDoc, ConfigType } from './type';
import { denormalizePath, normalizePath } from './utils';

export class DocUtils {
  public docs: DOC[] = [];

  public norDocs: NormalizedDoc = {}; // same doc ref

  public ignoreDirs: string[] = [];

  public docRootPath = '';

  public docRootPathDepth = 0;

  public configs: ConfigType;

  public git: SimpleGit | null = null;

  protected _gitSshAddressReg = /^git@github\.com:(.+)\/(.+)\.git$/;

  constructor(configs: ConfigType) {
    const { docRootPath, ignoreDirs = [] } = configs;

    this.configs = configs;
    this.ignoreDirs = ignoreDirs;
    this.docRootPath = path.resolve(docRootPath);
    this.updateDocPathParam();
  }

  public updateDocPathParam() {
    this.docRootPathDepth = this.docRootPath.split(path.sep).length;

    this.git = fs.existsSync(this.docRootPath) ? simpleGit(this.docRootPath) : null;
  }

  public isGitPath(docPath: string) {
    return this._gitSshAddressReg.exec(docPath)?.slice(1);
  }

  /** resolve git address: git@github.com:(username)/(repo-name).git */
  public resolveConfigGitPath() {
    const docPath = this.configs.docRootPath;

    if (!this._gitSshAddressReg.test(docPath)) return;

    const [username, repoName] = this._gitSshAddressReg.exec(docPath)?.slice(1) ?? [];

    const gitDocPath = path.resolve(__dirname, '..', `docs/${repoName}`);
    if (!fs.existsSync(gitDocPath)) {
      console.log(`pulling ${username}/${repoName}`);
      shell.exec(`cd ./docs && git clone ${docPath}`);
      console.log(`pulled ${username}/${repoName}`);
    }

    this.docRootPath = gitDocPath;
    this.updateDocPathParam();
  }

  public updateArticleAtCache(updatePath: string, content: string): void {
    const modifiedDoc = this.norDocs[updatePath].doc;

    const { headings, keywords } = this.docExtractor(content);

    modifiedDoc.headings = [...new Set(headings)];
    modifiedDoc.keywords = [...new Set(keywords)];
  }

  public createNewDocAtCache(docPath: string, isFile: boolean, newDoc?: DOC): void {
    const DocName = denormalizePath(docPath).slice(-1)[0];
    const parentDirPath = normalizePath(denormalizePath(docPath).slice(0, -1));

    if (!newDoc) {
      newDoc = {
        id: `${DocName}-${docPath}`,
        name: DocName,
        isFile,
        path: denormalizePath(docPath),
        children: [],
        headings: [],
        keywords: [],
      };
    }

    // root path
    if (parentDirPath === '') {
      // sync the norDocs
      this.norDocs[docPath] = {
        doc: newDoc,
        parent: this.docs,
      };

      this.docs.push(newDoc);
      this.docs.sort(this.docSort);
    } else {
      const parentDir = this.norDocs[parentDirPath].doc;

      if (parentDir) {
        parentDir.children.push(newDoc);
        parentDir.children.sort(this.docSort);
      }

      // sync the norDocs
      this.norDocs[docPath] = {
        doc: newDoc,
        parent: parentDir,
      };
    }
  }

  public deleteDocAtCache(docPath: string): void {
    if (!this.norDocs[docPath]) return;

    const parentDir = this.norDocs[docPath].parent;

    const docChildren: DOC[] = [];
    const filter = (doc: DOC) => {
      if (normalizePath(doc.path) !== docPath) {
        return true;
      }

      // delete the children as well
      docChildren.push(...doc.children);
    };
    // root path
    if (Array.isArray(parentDir)) {
      this.docs = this.docs.filter(filter);
    } else {
      parentDir.children = parentDir.children.filter(filter);
    }

    // sync norDocs
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.norDocs[docPath];
    docChildren.forEach((doc) => {
      const norDocPath = normalizePath(doc.path);
      if (this.norDocs[norDocPath]) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.norDocs[norDocPath];
      }
    });
  }

  public copyCutDocAtCache(copyCutPath: string, pastePath: string, isCopy: boolean): void {
    const pasteParentPath = normalizePath(denormalizePath(pastePath).slice(0, -1));
    // get a new ref with replace path
    const copyCutDoc = this.replacePath(this.norDocs[copyCutPath].doc, pasteParentPath);

    this.createNewDocAtCache(pastePath, copyCutDoc.isFile, copyCutDoc);

    // if it is cut, need to delete
    if (!isCopy) {
      this.deleteDocAtCache(copyCutPath);
    }
  }

  public modifyNameAtCache(modifyPath: string, newName: string, isFile: boolean): void {
    const { doc: modifiedDoc, parent: parentDoc } = this.norDocs[modifyPath];

    modifiedDoc.name = newName;
    modifiedDoc.path[modifiedDoc.path.length - 1] = newName;
    modifiedDoc.id = `${newName}-${modifiedDoc.path.join('-')}`;

    // sort
    if (Array.isArray(parentDoc)) parentDoc.sort(this.docSort);
    else parentDoc.children.sort(this.docSort);

    // modify the name at norDocs
    this.norDocs[normalizePath(modifiedDoc.path)] = {
      doc: modifiedDoc,
      parent: parentDoc,
    };

    // delete the original path
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.norDocs[modifyPath];

    if (!isFile) {
      // update the path for the children
      for (const child of modifiedDoc.children) {
        this.replacePathRef(child, normalizePath(modifiedDoc.path));
      }
    }
  }

  public docNormalizer(docs: DOC[]): NormalizedDoc {
    const normalization = (parentDoc: DOC | DOC[], normalizedDocs: NormalizedDoc = {}): void => {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      let docs: DOC[] = [];

      // root doc
      if (Array.isArray(parentDoc)) docs = parentDoc;
      else docs = parentDoc.children;

      for (const doc of docs) {
        // eslint-disable-next-line @typescript-eslint/no-shadow
        const { path, isFile } = doc;

        const norPath = normalizePath(path);

        // file
        if (isFile) {
          normalizedDocs[norPath] = {
            doc,
            parent: parentDoc,
          };
        } else {
          // dir
          normalizedDocs[norPath] = {
            doc,
            parent: parentDoc,
          };

          // recursively normalized the children
          normalization(doc, normalizedDocs);
        }
      }
    };

    const normalizedDocs = {};
    normalization(docs, normalizedDocs);

    return normalizedDocs;
  }

  public isFile(docPath: string): boolean {
    const stat = fs.statSync(docPath);

    return stat.isFile();
  }

  public isMarkdown(fileName: string): RegExpMatchArray | null {
    return fileName.match(/.md/g);
  }

  public isValidDir(dirName: string): boolean {
    return !this.ignoreDirs.includes(dirName);
  }

  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  public docExtractor(content: string, level = 4): { headings: string[]; keywords: string[] } {
    // omit the content in code fence
    content = content
      .replace(/```/g, '\f')
      .replace(/\f[^\f]*?\f/g, '')
      .replace(/\r|\n+/g, '\n');

    const HeadingReg = new RegExp(`(#{1,${level}}\\s.+)`, 'gi');
    const keywordsReg = /\*\*([^*]+)\*\*/gi;

    const keywords = (content.match(keywordsReg) ?? []).map((word) => word.replace(/\*\*/g, ''));

    return {
      headings: content.match(HeadingReg) ?? [],
      keywords,
    };
  }

  /**
   * @description 'js%2Fbasic%2Farray' -> js/basic/array.md or js/basic/array
   * @param strPath should be encodedURIComponent: xx%2Fxx%2Fxx
   * @param isFile
   * @param name
   * @returns
   */
  public pathConvertor(strPath: string, isFile: boolean, name?: string): string {
    const strPathArr = decodeURIComponent(strPath).split('/');

    // modify the name
    if (name) strPathArr.splice(strPathArr.length - 1, 1, name);

    return path.resolve(this.docRootPath, isFile ? strPathArr.join('/') + '.md' : strPathArr.join('/'));
  }

  // will return new ref of the doc
  public replacePath(doc: DOC, replacePath: string): DOC {
    // except the doc name of the top doc
    const removePathLen = doc.path.length - 1;

    const originalStack = [doc];

    const rootDoc = {
      children: [] as DOC[],
    };

    const parentStack: (DOC | typeof rootDoc)[] = [rootDoc];

    while (originalStack.length) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-shadow
      const { children, path, ...rest } = originalStack.pop()!;
      const parentDoc = parentStack.pop();

      let retPath: string[] = [];
      if (replacePath === '') retPath = new Array<string>().concat(path.slice(removePathLen));
      else retPath = denormalizePath(replacePath).concat(path.slice(removePathLen));

      const copyDoc: DOC = {
        ...rest,
        id: `${retPath.slice(-1)[0]}-${retPath.join('-')}`,
        children: [],
        path: retPath,
      };

      parentDoc?.children.push(copyDoc);

      originalStack.push(...children);
      // push the parent syncly with the children
      parentStack.push(...(new Array(children.length).fill(copyDoc) as DOC[]));
    }

    return rootDoc.children[0];
  }

  // wont return new ref of the doc
  public replacePathRef(doc: DOC, replacePath: string): void {
    // except the doc name of the top doc
    const removePathLen = doc.path.length - 1;

    const stack = [doc];
    while (stack.length) {
      const curDoc = stack.pop();

      if (!curDoc) return;

      const retPath =
        replacePath === ''
          ? new Array<string>().concat(curDoc.path.slice(removePathLen))
          : denormalizePath(replacePath).concat(curDoc.path.slice(removePathLen));

      // sync at norDocs
      this.norDocs[normalizePath(retPath)] = {
        doc: curDoc,
        parent: this.norDocs[normalizePath(curDoc.path)].parent,
      };
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.norDocs[normalizePath(curDoc.path)];

      curDoc.path = retPath;
      curDoc.id = `${retPath.slice(-1)[0]}-${retPath.join('-')}`;

      stack.push(...curDoc.children);
    }
  }

  // sorting rule
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  public docSort(this: void, a: DOC, b: DOC): number {
    // if a is a file but b is a dir, swap
    if (a.isFile && !b.isFile) return 1;
    // sort according the letters of the name for dir
    if (!a.isFile && !b.isFile && a.name.toLowerCase() > b.name.toLowerCase()) return 1;
    // sort according the letters for files
    if (a.isFile && b.isFile && a.id.toLowerCase() > b.id.toLowerCase()) return 1;
    else return -1;
  }

  // get the doc reference
  public getDocFromDocs(docPath: string): DOC | null {
    // dps
    const stack = [...this.docs];

    while (stack.length) {
      const topDoc = stack.pop();

      if (normalizePath(topDoc?.path ?? []) === docPath) return topDoc ?? null;

      if (topDoc?.children && topDoc?.children.length !== 0) stack.push(...(topDoc?.children ?? []));
    }

    return null;
  }
}
