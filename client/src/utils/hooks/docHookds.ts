import { useHistory, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  updateCopyCut,
  selectOperationMenu,
} from "@/redux-feature/operationMenuSlice";
import { getCurrentPath, isPathsRelated, localStore } from "../utils";

export const useDeleteHandler = () => {
  const { routerHistory, curPath } = useCurPath();

  const { copyPath, cutPath } = useSelector(selectOperationMenu);

  const dispatch = useDispatch();

  return (deletedPath: string, isFile: boolean) => {
    if (deletedPath === copyPath || deletedPath === cutPath) {
      // clear the previous copy and cut
      dispatch(
        updateCopyCut({
          copyPath: "",
          cutPath: "",
        })
      );
    }

    // jump if the current doc is deleted or included in the deleted folder
    if (isPathsRelated(curPath, deletedPath.split("-"), isFile)) {
      const { setStore: storeRecentPath } = localStore("recentPath");
      storeRecentPath(`/purePage`);

      routerHistory.push("/purePage");
    }
  };
};

export const useCopyCutHandler = () => {
  const { routerHistory, curPath } = useCurPath();

  return (
    copyCutPath: string,
    pastePath: string,
    isCut: boolean,
    isFile: boolean
  ) => {
    // if it is cut and current path is included in it, redirect
    if (isCut && isPathsRelated(curPath, copyCutPath.split("-"), isFile)) {
      // if it is a file, direct to the paste path
      if (isFile) {
        routerHistory.push(`/article/${pastePath}`);
      } else {
        const curFile = curPath
          .slice(
            curPath.length - (curPath.length - copyCutPath.split("-").length)
          )
          .join("-");

        routerHistory.push(`/article/${pastePath}-${curFile}`);
      }
    }
  };
};

export const useModifyNameHandler = () => {
  const { routerHistory, curPath } = useCurPath();

  return (ModifiedPath: string[], newPath: string, isFile: boolean) => {
    // hidden the window
    document.body.click();

    // modified path is or includes the current path
    if (isPathsRelated(curPath, ModifiedPath, isFile)) {
      const curFile = curPath
        .slice(curPath.length - (curPath.length - ModifiedPath.length))
        .join("-");

      // current file is modified
      if (curFile.trim() === "") {
        routerHistory.push(`/article/${newPath}`);
      } else {
        // current file is included the modified path
        routerHistory.push(`/article/${newPath}-${curFile}`);
      }
    }
  };
};

export const useCurPath = () => {
  const routerHistory = useHistory();
  const { pathname } = useLocation();

  return {
    routerHistory,
    curPath: getCurrentPath(pathname),
  };
};
