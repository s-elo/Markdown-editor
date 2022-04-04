import { DOC, normalizedDoc } from "@/redux-api/docsApiType";

export const localStore = (key: string) => {
  const value = window.localStorage.getItem(key);

  const setStore = (val: string) => window.localStorage.setItem(key, val);

  return { value, setStore };
};

/**
 * get the doc path based on the current router pathname
 */
export const getCurrentPath = (pathname: string) => {
  const paths = pathname.split("/");

  if (paths.length === 3) {
    return paths[2].split("-");
  } else {
    return [];
  }
};

export const isPathsRelated = (
  curPath: string[],
  path: string[],
  clickOnFile: boolean
) => {
  // same file
  // or the current path is included in the path
  if (
    curPath.join("-") === path.join("-") ||
    (!clickOnFile &&
      curPath.length > path.length &&
      curPath
        .slice(0, curPath.length - (curPath.length - path.length))
        .join("-") === path.join("-"))
  ) {
    return true;
  }
  return false;
};

export const docNormalizer = (docs: DOC[]) => {
  const normalization = (docs: DOC[], normalizedDocs: normalizedDoc = {}) => {
    for (const doc of docs) {
      const { path, isFile, children = [] } = doc;

      // file
      if (isFile) {
        normalizedDocs[path.join("-")] = {
          isFile,
          name: doc.name,
          // including dir
          siblings: docs.map(({ path }) => path.join("-")),
          children: [],
        };
      } else {
        // dir
        normalizedDocs[path.join("-")] = {
          isFile,
          name: doc.name,
          // including dir
          siblings: docs.map(({ path }) => path.join("-")),
          children: children.map(({ path }) => path.join("-")),
        };

        // recursively normalized the children
        normalization(children, normalizedDocs);
      }
    }
  };

  const normalizedDocs = {};
  normalization(docs, normalizedDocs);

  return normalizedDocs;
};
