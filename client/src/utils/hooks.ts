import { useRef, useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useUpdateDocMutation } from "@/redux-api/docsApi";
import { selectCurDoc, updateIsDirty } from "@/redux-feature/curDocSlice";
import Toast from "@/utils/Toast";
import {
  selectReadonly,
  updateGlobalOpts,
} from "@/redux-feature/globalOptsSlice";

export const useThrottle = (fn: Function, delay: number, deps = []) => {
  // these are the parameters for keeping the timer info when rerendering
  const { current } = useRef<{
    fn: Function;
    timer: NodeJS.Timeout | null;
    startTime: number;
  }>({
    fn,
    timer: null,
    startTime: Date.now(),
  });

  // keep the event function updated
  // so that the state from the closure is the latest if needed
  useEffect(() => {
    current.fn = fn;
    // eslint-disable-next-line
  }, [fn]);

  return useCallback(function (this: any) {
    const args = [...arguments];

    const curTime = Date.now();
    const remain = delay - (curTime - current.startTime);

    current.timer && clearTimeout(current.timer);
    // call at the beginning
    if (remain <= 0) {
      current.fn.apply(this, args);
      current.startTime = Date.now();
    } else {
      current.timer = setTimeout(() => {
        current.fn.apply(this, args);
        current.timer = null;
      }, remain);
    }
    // eslint-disable-next-line
  }, deps);
};

export const useDebounce = (
  fn: Function,
  delay: number,
  deps = [],
  immediate = true
) => {
  // these are the parameters for keeping the timer info when rerendering
  const { current } = useRef<{
    fn: Function;
    timer: NodeJS.Timeout | null;
  }>({
    fn,
    timer: null,
  });

  // keep the event function updated
  // so that the state from the closure is the latest if needed
  useEffect(() => {
    current.fn = fn;
    // eslint-disable-next-line
  }, [fn]);

  return useCallback(function (this: any) {
    const args = [...arguments];

    current.timer && clearTimeout(current.timer);

    if (immediate) {
      let flag = !current.timer;

      current.timer = setTimeout(() => {
        current.fn.apply(this, args);
        current.timer = null;
        flag = false;
      }, delay);

      if (flag) current.fn.apply(this, args);
    } else {
      current.timer = setTimeout(() => {
        current.fn.apply(this, args);
      }, delay);
    }
    // eslint-disable-next-line
  }, deps);
};

export const useShortCut = () => {
  const saveDoc = useSaveDoc();
  const readonlySwitch = useSwitchReadonlyMode();
  /**
   * binding keyborad shortcuts
   */
  useEffect(() => {
    const keydownEvent = async (e: KeyboardEvent) => {
      const keyName = e.key;

      if (keyName === "Control") {
        // do not alert when only Control key is pressed.
        return;
      }

      if (e.ctrlKey) {
        // Even though event.key is not 'Control' (e.g., 'a' is pressed),
        // event.ctrlKey may be true if Ctrl key is pressed at the same time.
        switch (keyName) {
          case "s": {
            // only prevent the defualt behavior when triggering
            // otherwise the inputs will not work
            e.preventDefault();

            await saveDoc();

            break;
          }
          case "r": {
            e.preventDefault();
            readonlySwitch();

            // auto save to refresh the doc if it has been edited
            await saveDoc();

            break;
          }
        }
      }
    };

    document.addEventListener("keydown", keydownEvent);

    return () => {
      document.removeEventListener("keydown", keydownEvent);
    };
  }, [saveDoc, readonlySwitch]);
};

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
