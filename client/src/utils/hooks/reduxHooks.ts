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
