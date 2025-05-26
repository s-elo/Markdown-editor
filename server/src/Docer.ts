import path from 'path';

import fs from 'fs-extra';

import { DocUtils } from './DocUtils';
import { DOC, ConfigType, Article } from './type';

class Docer extends DocUtils {
  constructor(configs: ConfigType) {
    super(configs);

    this.docs = [];
    this.norDocs = {};
  }

  public start() {
    this.resolveConfigGitPath();

    try {
      this.docs = this.getDocs();
      this.norDocs = this.docNormalizer(this.docs);
    } catch (err) {
      this.docs = [];
      this.norDocs = {};
    }
  }

  public updateConfigs(configs: ConfigType): void {
    const { docRootPath, ignoreDirs = [] } = configs;

    this.configs = configs;
    this.ignoreDirs = ignoreDirs;
    this.docRootPath = path.resolve(docRootPath);

    this.resolveConfigGitPath();

    this.refreshDoc();
  }

  public refreshDoc(): void {
    this.docs = [];
    this.docs = this.getDocs();
    this.norDocs = this.docNormalizer(this.docs);
  }

  public getDocs(docPath: string = this.docRootPath): DOC[] {
    // get directly from the cache
    if (this.docs.length !== 0) return this.docs;

    // only the states can use below, methods will have undefined 'this' if use below
    // unless the method is arrow function
    const { docRootPathDepth } = this;

    const names = fs.readdirSync(docPath);

    return (
      names
        // remain the directories that not filtered and markdown files
        // && hasMd(path.resolve(docPath, name))
        .filter((name) => (!this.isFile(path.resolve(docPath, name)) && this.isValidDir(name)) || this.isMarkdown(name))
        .map((name) => {
          // if it is a directory
          if (!this.isFile(path.resolve(docPath, name))) {
            // rootPath/xx/xx/ -> xx/xx
            const dirPath = docPath.split(path.sep).slice(docRootPathDepth).concat(name);

            return {
              id: `${name}-${dirPath.join('-')}`,
              name: name,
              isFile: false,
              path: dirPath,
              children: this.getDocs(path.resolve(docPath, name)),
              headings: [],
              keywords: [],
            };
          }

          // if it is a markdown file
          // read the file to extract the headings
          const content = fs.readFileSync(path.resolve(docPath, name), 'utf-8');
          const { headings, keywords } = this.docExtractor(content);

          // transform the filepath format
          // rootPath/xx/xx/ -> xx/xx/filename
          const filePath = docPath.split(path.sep).slice(docRootPathDepth).concat(name.split('.')[0]);

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
        .sort(this.docSort)
    );
  }

  // filePath: xx-xx-xx
  public getArticle(filePath: string): Article {
    // not exist return blank
    if (!fs.existsSync(this.pathConvertor(filePath, true))) {
      return { content: '', filePath, headings: [], keywords: [] };
    }

    const md = fs.readFileSync(this.pathConvertor(filePath, true), 'utf-8');

    // read from cache (it must be updated)
    if (this.norDocs[filePath])
      return {
        content: md,
        filePath,
        headings: this.norDocs[filePath].doc.headings,
        keywords: this.norDocs[filePath].doc.keywords,
      };

    const { headings, keywords } = this.docExtractor(md);

    return {
      content: md,
      filePath,
      headings: [...new Set(headings)],
      keywords: [...new Set(keywords.map((word) => word.replace(/\*\*/g, '')))],
    };
  }

  public updateArticle(updatePath: string, content: string): void {
    // if the path doesn't exist, create it
    const convertedPath = this.pathConvertor(updatePath, true);

    fs.ensureFileSync(convertedPath);

    fs.writeFileSync(convertedPath, content);

    this.updateArticleAtCache(updatePath, content);
  }

  public createDoc(docPath: string, isFile: boolean): void {
    const createdPath = this.pathConvertor(docPath, isFile);

    if (isFile) {
      fs.ensureFileSync(createdPath);
    } else {
      fs.ensureDirSync(createdPath);
    }

    // sync cache
    this.createNewDocAtCache(docPath, isFile);
  }

  public deleteDoc(docPath: string, isFile: boolean): void {
    const deletePath = this.pathConvertor(docPath, isFile);
    fs.removeSync(deletePath);

    // sync cache
    this.deleteDocAtCache(docPath);
  }

  public copyCutDoc(copyCutPath: string, pastePath: string, isCopy: boolean, isFile: boolean): void {
    if (isCopy) {
      fs.copySync(this.pathConvertor(copyCutPath, isFile), this.pathConvertor(pastePath, isFile));
    } else {
      void fs.move(this.pathConvertor(copyCutPath, isFile), this.pathConvertor(pastePath, isFile), { overwrite: true });
    }

    // sync cache
    this.copyCutDocAtCache(copyCutPath, pastePath, isCopy);
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
    const curPath = this.pathConvertor(modifyPath, isFile);

    if (!fs.existsSync(curPath)) return;

    const newPath = this.pathConvertor(modifyPath, isFile, name);

    fs.renameSync(curPath, newPath);

    /**
     * 2. modify at cache
     */
    this.modifyNameAtCache(modifyPath, name, isFile);
  };
}

const configPath = path.resolve(__dirname, '../../', 'config.json');

const configs = fs.existsSync(configPath) ? (JSON.parse(fs.readFileSync(configPath, 'utf-8')) as ConfigType) : null;

const defaultConfigs = {
  docRootPath: `${path.resolve(__dirname, '..', 'docs')}`,
  ignoreDirs: ['.git', 'imgs', 'node_modules', 'dist'],
};

if (configs) {
  if (!configs.ignoreDirs || !Array.isArray(configs.ignoreDirs)) configs.ignoreDirs = defaultConfigs.ignoreDirs;
} else {
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  void fs.writeFile(configPath, JSON.stringify(defaultConfigs, null, 2));
}

export const docer = new Docer(configs ? configs : defaultConfigs);
