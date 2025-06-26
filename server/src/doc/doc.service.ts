import path from 'path';

import { Inject, Injectable } from '@nestjs/common';
import fs from 'fs-extra';
import shell from 'shelljs';
import simpleGit, { SimpleGit } from 'simple-git';
import { SettingsService } from 'src/settings/settings.service';
import { Logger } from 'winston';

import { DOC, NormalizedDoc, Settings, Article } from './type';
import { denormalizePath, normalizePath } from '../utils';

const GIT_SSH_ADDRESS_REG = /^git@github\.com:(.+)\/(.+)\.git$/;

@Injectable()
export class DocService {
  public git: SimpleGit | null = null;

  private docs: DOC[] = [];

  /** same doc ref as docs */
  private norDocs: NormalizedDoc = {};

  private ignoreDirs: string[] = [];

  /** absolute path of the markdown doc root path, same as the git root path if using git */
  private docRootPath = '';

  /** if docRootPath is /user/docs, then docRootPathDepth is 2 */
  private docRootPathDepth = 0;

  constructor(@Inject('winston') private readonly logger: Logger, private readonly settingsService: SettingsService) {
    try {
      const { settings } = this.settingsService;
      this.ignoreDirs = settings.ignoreDirs ?? [];
      this.docRootPath = path.resolve(settings.docRootPath);
      this._syncDocRootPath();
      this._resolveConfigGitPath();

      try {
        this.docs = this.getDocs();
        this.norDocs = this._docNormalizer(this.docs);
      } catch (err) {
        this.docs = [];
        this.norDocs = {};

        throw err;
      }

      this.settingsService.onSettingsUpdated((newSettings) => {
        this.updateConfigs(newSettings);
      });

      this.logger.info('[DocService] Docs initialized.');
    } catch (err) {
      this.logger.error('[DocService] Docs initialization failed.');
    }
  }

  public updateConfigs(settings: Settings): void {
    const { docRootPath, ignoreDirs = [] } = settings;

    this.ignoreDirs = ignoreDirs;
    this.docRootPath = path.resolve(docRootPath);

    this._resolveConfigGitPath();

    this.refreshDoc();
  }

  public refreshDoc(): void {
    this.docs = [];
    this.docs = this.getDocs();
    this.norDocs = this._docNormalizer(this.docs);
  }

  public getDocs(docRootPath: string = this.docRootPath): DOC[] {
    // get directly from the cache
    if (this.docs.length !== 0) {
      this.logger.info('[DocService] getDocs: get docs from cache.');
      return this.docs;
    }

    // only the states can use below, methods will have undefined 'this' if use below
    // unless the method is arrow function
    const { docRootPathDepth } = this;

    const names = fs.readdirSync(docRootPath);

    return (
      names
        // remain the directories that not filtered and markdown files
        // && hasMd(path.resolve(docPath, name))
        .filter(
          (name) =>
            (!this._isFile(path.resolve(docRootPath, name)) && this._isValidDir(name)) || this._isMarkdown(name),
        )
        .map((name) => {
          // if it is a directory
          if (!this._isFile(path.resolve(docRootPath, name))) {
            // rootPath/xx/xx/ -> xx/xx
            const dirPath = docRootPath.split(path.sep).slice(docRootPathDepth).concat(name);

            return {
              id: `${name}-${dirPath.join('-')}`,
              name: name,
              isFile: false,
              path: dirPath,
              children: this.getDocs(path.resolve(docRootPath, name)),
              headings: [],
              keywords: [],
            };
          }

          // if it is a markdown file
          // read the file to extract the headings
          const content = fs.readFileSync(path.resolve(docRootPath, name), 'utf-8');
          const { headings, keywords } = this._docExtractor(content);

          // transform the filepath format
          // rootPath/xx/xx/ -> xx/xx/filename
          const filePath = docRootPath.split(path.sep).slice(docRootPathDepth).concat(name.split('.')[0]);

          return {
            id: `${name.split('.')[0]}-${filePath.join('-')}`,
            name: name.split('.')[0],
            isFile: true,
            path: filePath,
            children: [],
            headings: [...new Set(headings)],
            keywords: [...new Set(keywords)],
          };
        })
        // put the dir in the front
        .sort(this._docSort)
    );
  }

  public getNormalizedDocs(): NormalizedDoc {
    return this.norDocs;
  }

  /**
   * @param filePath should be encodedURIComponent: xx%2Fxx%2Fxx
   */
  public getArticle(filePath: string): Article | null {
    const docPath = this._pathConvertor(filePath, true);
    // not exist return blank
    if (!fs.existsSync(docPath)) {
      return null;
    }

    const md = fs.readFileSync(docPath, 'utf-8');

    // read from cache (it must be updated)
    if (this.norDocs[filePath]) {
      return {
        content: md,
        filePath,
        headings: this.norDocs[filePath].doc.headings,
        keywords: this.norDocs[filePath].doc.keywords,
      };
    }

    const { headings, keywords } = this._docExtractor(md);

    return {
      content: md,
      filePath,
      headings: [...new Set(headings)],
      keywords: [...new Set(keywords.map((word) => word.replace(/\*\*/g, '')))],
    };
  }

  public updateArticle(updatePath: string, content: string): void {
    // if the path doesn't exist, create it
    const convertedPath = this._pathConvertor(updatePath, true);

    fs.ensureFileSync(convertedPath);

    fs.writeFileSync(convertedPath, content);

    this._updateArticleAtCache(updatePath, content);
  }

  /** docPath should be encodedURIComponent: xx%2Fxx%2Fxx */
  public createDoc(docPath: string, isFile: boolean): DOC {
    const createdPath = this._pathConvertor(docPath, isFile);

    if (isFile) {
      fs.ensureFileSync(createdPath);
    } else {
      fs.ensureDirSync(createdPath);
    }

    // sync cache
    return this._createNewDocAtCache(docPath, isFile);
  }

  public deleteDoc(docPath: string, isFile: boolean): void {
    const deletePath = this._pathConvertor(docPath, isFile);
    fs.removeSync(deletePath);

    // sync cache
    this._deleteDocAtCache(docPath);
  }

  public copyCutDoc(copyCutPath: string, pastePath: string, isCopy: boolean, isFile: boolean): void {
    const pasteParentPath = this._pathConvertor(normalizePath(denormalizePath(pastePath).slice(0, -1)), false);
    if (!fs.existsSync(pasteParentPath)) {
      throw new Error(`The parent path ${pasteParentPath} of the paste path ${pastePath} does not exist.`);
    }

    if (isCopy) {
      fs.copySync(this._pathConvertor(copyCutPath, isFile), this._pathConvertor(pastePath, isFile));
    } else {
      fs.moveSync(this._pathConvertor(copyCutPath, isFile), this._pathConvertor(pastePath, isFile), {
        overwrite: true,
      });
    }

    // sync cache
    this._copyCutDocAtCache(copyCutPath, pastePath, isCopy);
  }

  public modifyName = (
    modifyPath: string,
    // no extent name
    name: string,
    isFile: boolean,
  ): void => {
    /**
     * 1. modify at file system
     */
    const curPath = this._pathConvertor(modifyPath, isFile);

    if (!fs.existsSync(curPath)) return;

    const newPath = this._pathConvertor(modifyPath, isFile, name);

    fs.renameSync(curPath, newPath);

    /**
     * 2. modify at cache
     */
    this._modifyNameAtCache(modifyPath, name, isFile);
  };

  /** sync doc root path and git root path */
  protected _syncDocRootPath() {
    this.docRootPathDepth = this.docRootPath.split(path.sep).length;
    this.git = fs.existsSync(this.docRootPath) ? simpleGit(this.docRootPath) : null;
  }

  /** resolve git address: git@github.com:(username)/(repo-name).git */
  protected _resolveConfigGitPath() {
    const docPath = this.settingsService.settings.docRootPath;

    if (!GIT_SSH_ADDRESS_REG.test(docPath)) return;

    const [username, repoName] = GIT_SSH_ADDRESS_REG.exec(docPath)?.slice(1) ?? [];

    const gitDocPath = path.resolve(__dirname, '..', `docs/${repoName}`);
    if (!fs.existsSync(gitDocPath)) {
      console.log(`pulling ${username}/${repoName}`);
      shell.exec(`cd ./docs && git clone ${docPath as string}`);
      console.log(`pulled ${username}/${repoName}`);
    }

    this.docRootPath = gitDocPath;
    this._syncDocRootPath();
  }

  /** updatePath should be encodedURIComponent: xx%2Fxx%2Fxx */
  protected _updateArticleAtCache(updatePath: string, content: string): void {
    const modifiedDoc = this.norDocs[updatePath].doc;

    const { headings, keywords } = this._docExtractor(content);

    modifiedDoc.headings = [...new Set(headings)];
    modifiedDoc.keywords = [...new Set(keywords)];
  }

  protected _createNewDocAtCache(docPath: string, isFile: boolean, newDoc?: DOC): DOC {
    const docName = denormalizePath(docPath).slice(-1)[0];
    const parentDirPath = normalizePath(denormalizePath(docPath).slice(0, -1));

    if (!newDoc) {
      newDoc = {
        id: `${docName}-${docPath}`,
        name: docName,
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
      this.docs.sort(this._docSort);
    } else {
      const parentDir = this.norDocs[parentDirPath].doc;

      if (parentDir) {
        parentDir.children.push(newDoc);
        parentDir.children.sort(this._docSort);
      }

      // sync the norDocs
      this.norDocs[docPath] = {
        doc: newDoc,
        parent: parentDir,
      };
    }

    return newDoc;
  }

  protected _deleteDocAtCache(docPath: string): void {
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

  /** copyCutPath and pastePath should be encodedURIComponent: xx%2Fxx%2Fxx */
  protected _copyCutDocAtCache(copyCutPath: string, pastePath: string, isCopy: boolean): void {
    const pasteParentPath = normalizePath(denormalizePath(pastePath).slice(0, -1));
    const pasteDocName = denormalizePath(pastePath).slice(-1)[0];
    // get a new ref with replace path
    const copyCutDoc = this._moveDoc(this.norDocs[copyCutPath].doc, pasteParentPath, pasteDocName);

    this._createNewDocAtCache(pastePath, copyCutDoc.isFile, copyCutDoc);

    // if it is cut, need to delete
    if (!isCopy) {
      this._deleteDocAtCache(copyCutPath);
    }
  }

  /** modifyPath should be encodedURIComponent: xx%2Fxx%2Fxx */
  protected _modifyNameAtCache(modifyPath: string, newName: string, isFile: boolean): void {
    const { doc: modifiedDoc, parent: parentDoc } = this.norDocs[modifyPath];

    modifiedDoc.name = newName;
    modifiedDoc.path[modifiedDoc.path.length - 1] = newName;
    modifiedDoc.id = `${newName}-${modifiedDoc.path.join('-')}`;

    // sort
    if (Array.isArray(parentDoc)) parentDoc.sort(this._docSort);
    else parentDoc.children.sort(this._docSort);

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
        this._replacePathRef(child, normalizePath(modifiedDoc.path));
      }
    }
  }

  /**
   * @description Normalize the docs to a flat structure: Map<filePath, { doc, parent }>
   * when parent is an array, it means the doc is a root doc
   * @param docs docs to be normalized
   * @returns normalized docs
   */
  protected _docNormalizer(docs: DOC[]): NormalizedDoc {
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

  protected _isFile(docPath: string): boolean {
    const stat = fs.statSync(docPath);

    return stat.isFile();
  }

  protected _isMarkdown(fileName: string): RegExpMatchArray | null {
    return fileName.match(/.md/g);
  }

  protected _isValidDir(dirName: string): boolean {
    return !this.ignoreDirs.includes(dirName);
  }

  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  protected _docExtractor(content: string, level = 4): { headings: string[]; keywords: string[] } {
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
  protected _pathConvertor(strPath: string, isFile: boolean, name?: string): string {
    const strPathArr = decodeURIComponent(strPath).split('/');

    // modify the name
    if (name) strPathArr.splice(strPathArr.length - 1, 1, name);

    return path.resolve(this.docRootPath, isFile ? strPathArr.join('/') + '.md' : strPathArr.join('/'));
  }

  /** create a new doc ref including the children under the replacePath based on the provided doc, return the new doc ref */
  protected _moveDoc(doc: DOC, underParentPath: string, newName?: string): DOC {
    /** The moved doc name idx */
    const movedDocNameIdx = doc.path.length - 1;

    const originalStack = [doc];

    const rootDoc = {
      children: [] as DOC[],
    };

    const parentStack: (DOC | typeof rootDoc)[] = [rootDoc];

    // create new children ref
    while (originalStack.length) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-shadow
      const { children, path, ...rest } = originalStack.pop()!;
      const parentDoc = parentStack.pop();

      let retPath: string[] = [];
      if (underParentPath === '') retPath = new Array<string>().concat(path.slice(movedDocNameIdx));
      else retPath = denormalizePath(underParentPath).concat(path.slice(movedDocNameIdx));

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

    const newDocRef = rootDoc.children[0];
    if (newName) {
      const newDocPath = newDocRef.path.slice(0, -1).concat(newName);
      newDocRef.path = newDocPath;
      newDocRef.id = `${newName}-${newDocPath.join('-')}`;
      newDocRef.name = newName;
    }

    return newDocRef;
  }

  // wont return new ref of the doc
  protected _replacePathRef(doc: DOC, replacePath: string): void {
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
  protected _docSort(this: void, a: DOC, b: DOC): number {
    // if a is a file but b is a dir, swap
    if (a.isFile && !b.isFile) return 1;
    // sort according the letters of the name for dir
    if (!a.isFile && !b.isFile && a.name.toLowerCase() > b.name.toLowerCase()) return 1;
    // sort according the letters for files
    if (a.isFile && b.isFile && a.id.toLowerCase() > b.id.toLowerCase()) return 1;
    else return -1;
  }

  /** get a doc reference by doc path */
  protected _getDocFromDocs(docPath: string): DOC | null {
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
