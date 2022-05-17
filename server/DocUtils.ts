import fs from "fs-extra";
import path from "path";

import { DOC, NormalizedDoc } from "./type";

export default class DocUtils {
  docs: DOC[] = [];
  norDocs: NormalizedDoc = {}; // same doc ref
  ignoreDirs: string[] = [];
  docRootPath: string = "";
  docRootPathDepth: number = 0;

  constructor(docRootPath: string, ignoreDirs: string[] = []) {
    this.ignoreDirs = ignoreDirs;
    this.docRootPath = docRootPath;
    this.docRootPathDepth = docRootPath.split(path.sep).length;
  }

  updateArticleAtCache(updatePath: string, content: string) {
    const modifiedDoc = this.norDocs[updatePath].doc;

    const { headings, keywords } = this.docExtractor(content);

    modifiedDoc.headings = [...new Set(headings)];
    modifiedDoc.keywords = [...new Set(keywords)];
  }

  createNewDocAtCache(docPath: string, isFile: boolean, newDoc?: DOC) {
    const DocName = docPath.split("-").slice(-1)[0];
    const parentDirPath = docPath.split("-").slice(0, -1).join("-");

    !newDoc &&
      (newDoc = {
        id: `${DocName}-${docPath}`,
        name: DocName,
        isFile,
        path: docPath.split("-"),
        children: [],
        headings: [],
        keywords: [],
      });

    // root path
    if (parentDirPath === "") {
      // sync the norDocs
      this.norDocs[docPath] = {
        doc: newDoc,
        parent: this.docs,
      };

      this.docs.push(newDoc);
    } else {
      const parentDir = this.norDocs[parentDirPath].doc;

      parentDir && parentDir.children.push(newDoc);

      // sync the norDocs
      this.norDocs[docPath] = {
        doc: newDoc,
        parent: parentDir,
      };
    }
  }

  deleteDocAtCache(docPath: string) {
    if (!this.norDocs[docPath]) return;

    const parentDir = this.norDocs[docPath].parent;

    // root path
    if (Array.isArray(parentDir)) {
      this.docs = this.docs.filter((doc) => doc.path.join("-") !== docPath);
    } else {
      parentDir.children = parentDir.children.filter(
        (doc) => doc.path.join("-") !== docPath
      );
    }

    // sync norDocs
    delete this.norDocs[docPath];
  }

  copyCutDocAtCache(copyCutPath: string, pastePath: string, isCopy: boolean) {
    const pasteParentPath = pastePath.split("-").slice(0, -1).join("-");
    // get a new ref with replace path
    const copyCutDoc = this.replacePath(
      this.norDocs[copyCutPath].doc,
      pasteParentPath
    );

    this.createNewDocAtCache(pastePath, copyCutDoc.isFile, copyCutDoc);

    // if it is cut, need to delete
    if (!isCopy) {
      this.deleteDocAtCache(copyCutPath);
    }
  }

  modifyNameAtCache(modifyPath: string, newName: string, isFile: boolean) {
    const { doc: modifiedDoc, parent: parentDoc } = this.norDocs[modifyPath];

    modifiedDoc.name = newName;
    modifiedDoc.path[modifiedDoc.path.length - 1] = newName;
    modifiedDoc.id = `${newName}-${modifiedDoc.path.join("-")}`;

    // modify the name at norDocs
    this.norDocs[modifiedDoc.path.join("-")] = {
      doc: modifiedDoc,
      parent: parentDoc,
    };

    // delete the original path
    delete this.norDocs[modifyPath];

    if (!isFile) {
      // update the path for the children
      for (const child of modifiedDoc.children) {
        this.replacePathRef(child, modifiedDoc.path.join("-"));
      }
    }
  }

  docNormalizer(docs: DOC[]) {
    const normalization = (
      parentDoc: DOC | DOC[],
      normalizedDocs: NormalizedDoc = {}
    ) => {
      let docs: DOC[];

      // root doc
      if (Array.isArray(parentDoc)) docs = parentDoc;
      else docs = parentDoc.children;

      for (const doc of docs) {
        const { path, isFile } = doc;

        // file
        if (isFile) {
          normalizedDocs[path.join("-")] = {
            doc,
            parent: parentDoc,
          };
        } else {
          // dir
          normalizedDocs[path.join("-")] = {
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

  isFile(docPath: string) {
    const stat = fs.statSync(docPath);

    return stat.isFile();
  }

  isMarkdown(fileName: string) {
    return fileName.match(/.md/g);
  }

  isValidDir(dirName: string) {
    return !this.ignoreDirs.includes(dirName);
  }

  docExtractor(content: string, level: number = 3) {
    const HeadingReg = new RegExp(`(#{1,${level}}\\s.+)`, "gi");
    const keywordsReg = /\*\*(.+)\*\*/gi;

    const keywords = (content.match(keywordsReg) ?? []).map((word) =>
      word.replace(/\*\*/g, "")
    );

    return {
      headings: content.match(HeadingReg) ?? [],
      keywords,
    };
  }

  // 'js-basic-array' -> js/basic/array.md or js/basic/array
  pathConvertor(strPath: string, isFile: boolean, name?: string) {
    const strPathArr = strPath.split("-");

    // modify the name
    if (name) strPathArr.splice(strPathArr.length - 1, 1, name);

    return path.resolve(
      this.docRootPath,
      isFile ? strPathArr.join("/") + ".md" : strPathArr.join("/")
    );
  }

  // will return new ref of the doc
  replacePath(doc: DOC, replacePath: string) {
    // except the doc name of the top doc
    const removePathLen = doc.path.length - 1;

    const originalStack = [doc];

    const rootDoc = {
      children: [] as DOC[],
    };

    const Parentstack: (DOC | typeof rootDoc)[] = [rootDoc];

    while (originalStack.length) {
      const { children, path, id, ...rest } = originalStack.pop() as DOC;
      const parentDoc = Parentstack.pop();

      let retPath: string[];
      if (replacePath === "")
        retPath = new Array<string>().concat(path.slice(removePathLen));
      else retPath = replacePath.split("-").concat(path.slice(removePathLen));

      const copyDoc = {
        ...rest,
        id: `${retPath.slice(-1)[0]}-${retPath.join("-")}`,
        children: [],
        path: retPath,
      };

      parentDoc?.children.push(copyDoc);

      originalStack.push(...children);
      // push the parent syncly with the children
      Parentstack.push(...new Array(children.length).fill(copyDoc));
    }

    return rootDoc.children[0];
  }

  // wont return new ref of the doc
  replacePathRef(doc: DOC, replacePath: string) {
    // except the doc name of the top doc
    const removePathLen = doc.path.length - 1;

    const stack = [doc];
    while (stack.length) {
      const curDoc = stack.pop() as DOC;

      const retPath =
        replacePath === ""
          ? new Array<string>().concat(curDoc.path.slice(removePathLen))
          : replacePath.split("-").concat(curDoc.path.slice(removePathLen));

      // sync at norDocs
      this.norDocs[retPath.join("-")] = {
        doc: curDoc,
        parent: this.norDocs[curDoc.path.join("-")].parent,
      };
      delete this.norDocs[curDoc.path.join("-")];

      curDoc.path = retPath;
      curDoc.id = `${retPath.slice(-1)[0]}-${retPath.join("-")}`;

      stack.push(...curDoc.children);
    }
  }

  // get the doc reference
  getDocFromDocs(docPath: string): DOC | null {
    // dps
    const stack = [...this.docs];

    while (stack.length) {
      const topDoc = stack.pop();

      if (topDoc?.path.join("-") === docPath) return topDoc;

      if (topDoc?.children && topDoc?.children.length !== 0)
        stack.push(...topDoc?.children);
    }

    return null;
  }
}
