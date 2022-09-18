import { useSelector, useDispatch } from "react-redux";
import { useUpdateDocMutation } from "@/redux-api/docsApi";
import {
  selectCurDoc,
  selectCurTabs,
  updateIsDirty,
  updateTabs,
} from "@/redux-feature/curDocSlice";
import {
  selectReadonly,
  selectDarkMode,
  updateGlobalOpts,
} from "@/redux-feature/globalOptsSlice";

import { isPathsRelated } from "../utils";
import Toast from "@/utils/Toast";
import { useCurPath } from "./docHookds";

export const useSaveDoc = () => {
  const { isDirty, content, contentPath } = useSelector(selectCurDoc);

  const dispatch = useDispatch();
  const [
    updateDoc,
    // { isLoading }
  ] = useUpdateDocMutation();

  return async () => {
    if (!isDirty) return;

    try {
      await updateDoc({
        modifyPath: contentPath,
        newContent: content,
      }).unwrap();

      // pop up to remind that is saved
      Toast("saved", "SUCCESS");

      // after updated, it should not be dirty
      dispatch(updateIsDirty({ isDirty: false }));
    } catch (err) {
      Toast("Failed to save...", "ERROR");
    }
  };
};

export const useSwitchReadonlyMode = () => {
  const readonly = useSelector(selectReadonly);

  const dispatch = useDispatch();

  return () => {
    dispatch(
      updateGlobalOpts({
        keys: ["readonly"],
        values: [!readonly],
      })
    );
  };
};

export const useSwitchTheme = () => {
  const isDarkMode = useSelector(selectDarkMode);

  const dispatch = useDispatch();

  return () => {
    dispatch(
      updateGlobalOpts({
        keys: ["isDarkMode"],
        values: [!isDarkMode],
      })
    );
  };
};

export const useDeleteTab = () => {
  const tabs = useSelector(selectCurTabs);
  const dispatch = useDispatch();
  const { routerHistory: router, curPath } = useCurPath();

  return (deletePath: string) => {
    dispatch(
      updateTabs(
        tabs.filter((tab, idx) => {
          // handle curDoc
          if (deletePath === curPath.join("-")) {
            if (idx !== tabs.length - 1)
              router.push(`/article/${tabs[idx + 1].path}`);
            // only one tab
            else if (idx === 0) router.push("/purePage");
            else router.push(`/article/${tabs[idx - 1].path}`);
          }
          return tab.path !== deletePath;
        })
      )
    );
  };
};

export const useAddTab = () => {
  const tabs = useSelector(selectCurTabs);
  const dispatch = useDispatch();
  const { routerHistory: router, curPath } = useCurPath();

  return (addPath: string) => {
    dispatch(
      updateTabs(
        tabs.concat({
          active: true,
          path: addPath,
          scroll: 0,
        })
      )
    );

    if (curPath.join("-") !== addPath) router.push(`/article/${addPath}`);
  };
};

export const useRenameTab = () => {
  const { routerHistory, curPath } = useCurPath();
  const tabs = useSelector(selectCurTabs);
  const dispatch = useDispatch();

  return (oldPath: string, newPath: string, isFile: boolean) => {
    const oldPathArr = oldPath.split("-");

    dispatch(
      updateTabs(
        tabs.map(({ path, ...rest }) => {
          const pathArr = path.split("-");

          if (!isPathsRelated(pathArr, oldPathArr, isFile))
            return { path, ...rest };

          // modified path is or includes the current path
          const curFile = pathArr
            .slice(pathArr.length - (pathArr.length - oldPathArr.length))
            .join("-");

          // current file is modified
          if (curFile.trim() === "") {
            path === curPath.join("-") &&
              routerHistory.push(`/article/${newPath}`);
            return { path: newPath, ...rest };
          }

          // current file is included the modified path
          path === curPath.join("-") &&
            routerHistory.push(`/article/${newPath}-${curFile}`);
          return { path: `${newPath}-${curFile}`, ...rest };
        })
      )
    );
  };
};
