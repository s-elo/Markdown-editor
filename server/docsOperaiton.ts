import fs from "fs-extra";
import path from "path";
import { docRootPath } from "./getDocs";

// add or edit a markdown
export const additDoc = (modifyPath: string, content: string) => {
  // if the path doesnt exsit, create it
  const convertedPath = pathConvertor(modifyPath, true);

  fs.ensureFileSync(convertedPath);

  fs.writeFileSync(convertedPath, content);
};

export const modifyName = (
  modifyPath: string,
  // no extent name
  name: string,
  isFile: boolean
) => {
  const curPath = pathConvertor(modifyPath, isFile);

  if (!fs.existsSync(curPath)) return;

  const newPath = pathConvertor(modifyPath, isFile, name);

  fs.renameSync(curPath, newPath);
};

// 'js-basic-array' -> js/basic/array.md or js/basic/array
export const pathConvertor = (
  strPath: string,
  isFile: boolean,
  name?: string
) => {
  const strPathArr = strPath.split("-");

  // modify the name
  if (name) strPathArr.splice(strPathArr.length - 1, 1, name);

  return path.resolve(
    docRootPath,
    isFile ? strPathArr.join("/") + ".md" : strPathArr.join("/")
  );
};
