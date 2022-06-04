// import { DOC, NormalizedDoc } from "@/redux-api/docsApiType";
import themes from "@/theme";

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

export const throttle = (fn: Function, delay: number) => {
  let startTime = Date.now();
  let timer: NodeJS.Timeout | null = null;

  return function (this: any) {
    const args = [...arguments];

    const curTime = Date.now();
    const remain = delay - (curTime - startTime);

    timer && clearTimeout(timer);
    // call the fn at the beginning
    if (remain <= 0) {
      fn.apply(this, args);
      startTime = Date.now();
    } else {
      timer = setTimeout(() => {
        fn.apply(this, args);
        timer = null;
      }, remain);
    }
  };
};

export const debounce = (fn: Function, delay: number, immediate = true) => {
  let timer: NodeJS.Timeout | null = null;

  return function (this: any) {
    const args = [...arguments];

    timer && clearTimeout(timer);

    if (immediate) {
      let flag = !timer;

      timer = setTimeout(() => {
        fn.apply(this, args);
        timer = null;
        flag = false;
      }, delay);

      // first time
      if (flag) fn.apply(this, args);
    } else {
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    }
  };
};

export const getImgUrl = (imgFile: File): string => {
  const Window = window as any;

  let url = "";
  if (Window.createObjectURL) {
    // basic
    url = Window.createObjectURL(imgFile);
  } else if (Window.URL) {
    // mozilla(firefox)
    url = Window.URL.createObjectURL(imgFile);
  } else if (Window.webkitURL) {
    // webkit or chrome
    url = Window.webkitURL.createObjectURL(imgFile);
  }

  return url;
};

export const hightlight = (
  word: string,
  inputs: string[],
  color = "rgb(188, 54, 54)"
) => {
  return inputs.reduce((hightLight, inputWord) => {
    const reg = new RegExp(`${inputWord}`, "gi");

    return hightLight.replace(
      reg,
      (matchWord) =>
        `<span style="background-color: ${color}">${matchWord}</span>`
    );
  }, word);
};

export const changeTheme = (themeName: string) => {
  const theme = themes[themeName as keyof typeof themes];

  for (const themeKey in theme) {
    document.body.style.setProperty(
      `--${themeKey}`,
      theme[themeKey as keyof typeof theme]
    );
  }
};

export function scrollToBottomListener(
  container: HTMLElement,
  callback: () => void,
  bias = 3
) {
  const fn = () => {
    // the height of the container
    const containerHeight = container.scrollHeight;
    // the distance that the scroll bar has been scrolled
    const scrolledTop = container.scrollTop;
    // visible height of the container
    const visibleHeight = container.clientHeight;

    // visibleHeight + max(scrolledTop) = containerHeight

    //  the bias is make sure that
    //  the callback will be called when almost to the bottom
    if (scrolledTop + visibleHeight + bias > containerHeight) {
      callback();
    }
  };

  container.addEventListener("scroll", fn);

  return () => container.removeEventListener("scroll", fn);
}
