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

export const dragEventBinder = (callback: (e: MouseEvent) => void) => {
  document.addEventListener("mousemove", callback);

  const mouseupEvent = () => {
    document.removeEventListener("mousemove", callback);
    document.removeEventListener("mouseup", mouseupEvent);
  };

  document.addEventListener("mouseup", mouseupEvent);
};

export const smoothCollapse = (
  isCollapse: boolean,
  collapseCallbacks?: () => void,
  openCallbacks?: () => void
) => {
  return (boxDom: HTMLDivElement) => {
    // only called when switching the collapse state
    if (isCollapse) {
      // when collapsing, add transition immediately
      if (!boxDom) return;
      boxDom.style.transition = "all 0.4s ease-in-out";

      // wait for the collapsing finishing then execute the below callbacks
      if (!collapseCallbacks) return;

      const timer = setTimeout(() => {
        collapseCallbacks();
        clearTimeout(timer);
      }, 500);
    } else {
      // when to open the box, execute the below callbacks immediately
      openCallbacks && openCallbacks();

      // when opening the box, after finishing the transition (wati >= 0.4s)
      // remove the transition for the dragging
      const timer = setTimeout(() => {
        if (boxDom) boxDom.style.transition = "none";

        clearTimeout(timer);
      }, 500);
    }
  };
};
