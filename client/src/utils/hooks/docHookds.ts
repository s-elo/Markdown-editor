import { useHistory, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  updateCopyCut,
  selectOperationMenu,
} from "@/redux-feature/operationMenuSlice";
import { getCurrentPath, isPathsRelated } from "../utils";
import { useDeleteTab, useRenameTab, useSaveDoc } from "./reduxHooks";
import { Change } from "@/redux-api/gitApi";
import { updateGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { updateCurDoc, selectCurDocDirty } from "@/redux-feature/curDocSlice";

export const useDeleteHandler = () => {
  const { curPath } = useCurPath();

  const { copyPath, cutPath } = useSelector(selectOperationMenu);
  const isDirty = useSelector(selectCurDocDirty);

  const dispatch = useDispatch();

  const deleteTab = useDeleteTab();

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
      // clear global curDoc info
      if (isDirty) {
        dispatch(
          updateCurDoc({
            content: "",
            isDirty: false,
            contentPath: "",
            scrollTop: 0,
          })
        );
      }

      deleteTab(curPath.join("-"));
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
  // const addTab = useAddTab();
  const renameTab = useRenameTab();

  return (ModifiedPath: string[], newPath: string, isFile: boolean) => {
    // hidden the window
    document.body.click();

    renameTab(ModifiedPath.join("-"), newPath, isFile);
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

/**
 * handler for git restore at working space
 */
export const useRetoreHandler = () => {
  const deleteHandler = useDeleteHandler();

  return (staged: boolean, changes: Change[]) => {
    // if it is in the working space and restored changes include untracked status
    // call the deleteHandler
    if (!staged) {
      for (const change of changes) {
        if (change.status === "UNTRACKED") {
          deleteHandler(
            change.changePath.replace(".md", "").replaceAll("/", "-"),
            true
          );
        }
      }
    }
  };
};

export const useEditorScrollToAnchor = () => {
  const { routerHistory, curPath } = useCurPath();

  const dispatch = useDispatch();
  const saveDoc = useSaveDoc();

  return (anchor: string, path: string = "") => {
    // only do if path is provided
    if (path !== "" && curPath.join("-") !== path) {
      if (anchor !== "") {
        // tell the editor through global opts
        dispatch(updateGlobalOpts({ keys: ["anchor"], values: [anchor] }));
      }

      saveDoc();

      return routerHistory.push(`/article/${path}`);
    }

    if (anchor !== "") {
      const dom = [...document.getElementsByClassName("heading")].find(
        (head) => (head as HTMLElement).innerText === anchor
      );
      const strongDom = [...document.getElementsByClassName("strong")].find(
        (keyword) => (keyword as HTMLElement).innerText === anchor
      );

      if (!dom && !strongDom) return;

      const parentDom = document.getElementsByClassName(
        "milkdown"
      )[0] as HTMLElement;

      parentDom.scroll({
        top: dom
          ? (dom as HTMLElement).offsetTop
          : (strongDom as HTMLElement).offsetTop,
        behavior: "smooth",
      });
    }
  };
};
