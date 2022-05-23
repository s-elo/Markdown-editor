import { throws } from "assert";
import fs from "fs-extra";
import path from "path";

import DocUtils from "./DocUtils";

import { DOC, ConfigType } from "./type";

class Docer extends DocUtils {
  constructor(configs: ConfigType) {
    super(configs);

    this.docs = this.getDocs();
    this.norDocs = this.docNormalizer(this.docs);
  }

  getDocs(docPath: string = this.docRootPath): DOC[] {
    // get directly from the cache
    if (this.docs.length !== 0) return this.docs;

    // only the states can use below, methods will have undefined 'this' if use below
    const { docRootPathDepth } = this;

    const names = fs.readdirSync(docPath);

    return (
      names
        // remain the directories that not filtered and markdown files
        // && hasMd(path.resolve(docPath, name))
        .filter(
          (name) =>
            (!this.isFile(path.resolve(docPath, name)) &&
              this.isValidDir(name)) ||
            this.isMarkdown(name)
        )
        .map((name) => {
          // if it is a directory
          if (!this.isFile(path.resolve(docPath, name))) {
            // rootpath/xx/xx/ -> xx/xx
            const dirPath = docPath
              .split(path.sep)
              .slice(docRootPathDepth)
              .concat(name);

            return {
              id: `${name}-${dirPath.join("-")}`,
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
          const content = fs.readFileSync(path.resolve(docPath, name), "utf-8");
          const { headings, keywords } = this.docExtractor(content);

          // transform the filepath format
          // rootpath/xx/xx/ -> xx/xx/filename
          const filePath = docPath
            .split(path.sep)
            .slice(docRootPathDepth)
            .concat(name.split(".")[0]);

          return {
            id: `${name.split(".")[0]}-${filePath.join("-")}`,
            name: name.split(".")[0],
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
  getArticle(filePath: string) {
    // not exsit return blank
    if (!fs.existsSync(this.pathConvertor(filePath, true))) {
      return { content: "", filePath, headings: [], keywords: [] };
    }

    const md = fs.readFileSync(this.pathConvertor(filePath, true), "utf-8");

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
      keywords: [...new Set(keywords.map((word) => word.replace(/\*\*/g, "")))],
    };
  }

  updateArticle(updatePath: string, content: string) {
    // if the path doesnt exsit, create it
    const convertedPath = this.pathConvertor(updatePath, true);

    fs.ensureFileSync(convertedPath);

    fs.writeFileSync(convertedPath, content);

    this.updateArticleAtCache(updatePath, content);
  }

  createDoc(docPath: string, isFile: boolean) {
    const createdPath = this.pathConvertor(docPath, isFile);

    if (isFile) {
      fs.ensureFileSync(createdPath);
    } else {
      fs.ensureDirSync(createdPath);
    }

    // sync cache
    this.createNewDocAtCache(docPath, isFile);
  }

  deleteDoc(docPath: string, isFile: boolean) {
    const deletePath = this.pathConvertor(docPath, isFile);
    fs.removeSync(deletePath);

    // sync cache
    this.deleteDocAtCache(docPath);
  }

  copyCutDoc(
    copyCutPath: string,
    pastePath: string,
    isCopy: boolean,
    isFile: boolean
  ) {
    if (isCopy) {
      fs.copySync(
        this.pathConvertor(copyCutPath, isFile),
        this.pathConvertor(pastePath, isFile)
      );
    } else {
      fs.move(
        this.pathConvertor(copyCutPath, isFile),
        this.pathConvertor(pastePath, isFile),
        { overwrite: true }
      );
    }

    // sync cache
    this.copyCutDocAtCache(copyCutPath, pastePath, isCopy);
  }

  modifyName = (
    modifyPath: string,
    // no extent name
    name: string,
    isFile: boolean
  ) => {
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

const configPath = path.resolve(__dirname, "..", "config.json");
if (!fs.existsSync(configPath)) throw new Error("no config.json file found");

const configs = JSON.parse(fs.readFileSync(configPath, "utf-8")) as ConfigType;

export default new Docer(configs);
