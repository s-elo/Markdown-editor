import { useSelector, useDispatch } from "react-redux";
import { useUpdateDocMutation } from "@/redux-api/docsApi";
import { selectCurDoc, updateIsDirty } from "@/redux-feature/curDocSlice";
import {
  selectReadonly,
  selectDarkMode,
  updateGlobalOpts,
} from "@/redux-feature/globalOptsSlice";

import Toast from "@/utils/Toast";

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
