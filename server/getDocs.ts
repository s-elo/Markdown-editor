import fs from "fs-extra";
import path from "path";

import { DOC } from "./type";

export const docRootPath = path.resolve(`D:/WEB/interview/`);
const docRootPathDepth = docRootPath.split(path.sep).length;

export const ignoreDirs = [".git", "imgs"];

export const isFile = (path: string) => {
  const stat = fs.statSync(path);

  return stat.isFile();
};

export const isMarkdown = (fileName: string) => {
  return fileName.match(/.md/g);
};

// filter some directories
export const isValidDir = (dirName: string) => !ignoreDirs.includes(dirName);

export const hasMd = (dirPath: string) => {
  const fileNames = fs.readdirSync(dirPath);

  for (const fileName of fileNames) {
    // if it is a valid dir
    if (!isFile(`${dirPath}/${fileName}`) && isValidDir(fileName)) {
      // for the next level of dir
      const hasMd_ = hasMd(`${dirPath}/${fileName}`);

      if (hasMd_) return true;
    }

    // if it a markdown file
    if (isMarkdown(fileName)) return true;
  }

  // no valid directory and markdown
  return false;
};

const getDocs = (docPath: string): DOC[] => {
  const names = fs.readdirSync(docPath);

  return (
    names
      // remain the directories that not filtered and markdown files
      // && hasMd(path.resolve(docPath, name))
      .filter(
        (name) =>
          (!isFile(path.resolve(docPath, name)) && isValidDir(name)) ||
          isMarkdown(name)
      )
      .map((name) => {
        // if it is a directory
        if (!isFile(path.resolve(docPath, name))) {
          const dirPath = docPath
            .split(path.sep)
            .slice(docRootPathDepth)
            .concat(name);

          return {
            id: `${name}-${dirPath.join("-")}`,
            name: name,
            isFile: false,
            path: dirPath,
            children: getDocs(path.resolve(docPath, name)),
          };
        }

        // if it is a markdown file
        // read the file to extract the headings
        const content = fs.readFileSync(path.resolve(docPath, name), "utf-8");
        const { headings, keywords } = docExtractor(content);

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
          headings,
          keywords: keywords.map((word) => word.replace(/\*\*/g, "")),
        };
      })
      // put the dir in the front
      .sort((a, b) => {
        // if a is a file but b is a dir, swap
        if (a.isFile && !b.isFile) return 1;
        // sort according the letters of the name for dir
        if (
          !a.isFile &&
          !b.isFile &&
          a.name.toLowerCase() > b.name.toLowerCase()
        )
          return 1;
        // sort according the letters for files
        if (a.isFile && b.isFile && a.id.toLowerCase() > b.id.toLowerCase())
          return 1;
        else return -1;
      })
  );
};

function docExtractor(content: string, level: number = 3) {
  const HeadingReg = new RegExp(`(#{1,${level}}.+)`, "gi");
  const keywordsReg = /\*\*(.+)\*\*/gi;

  return {
    headings: content.match(HeadingReg) ?? [],
    keywords: content.match(keywordsReg) ?? [],
  };
}

export default getDocs;
