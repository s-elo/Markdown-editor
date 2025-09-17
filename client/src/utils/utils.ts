import { confirmDialog, ConfirmDialogProps } from 'primereact/confirmdialog';

/* eslint-disable @typescript-eslint/no-magic-numbers */
export const normalizePath = (pathArr: string[] | string): string =>
  typeof pathArr === 'string' ? encodeURIComponent(pathArr) : encodeURIComponent(pathArr.join('/'));

export const denormalizePath = (pathStr: string) => decodeURIComponent(pathStr).split('/');

export const localStore = (key: string) => {
  const value = window.localStorage.getItem(key);

  const setStore = (val: string) => {
    window.localStorage.setItem(key, val);
  };

  return { value, setStore };
};

/**
 * get the doc path based on the current router pathname
 * @example / -> []
 * /article -> []
 * /article/xx%2Fyy%2Fz -> ['xx', 'yy', 'z']
 */
export const getCurrentPath = (pathname: string) => {
  const paths = pathname.split('/');

  if (paths.length === 3) {
    return denormalizePath(paths[2]);
  } else {
    return [];
  }
};

export const isPathsRelated = (curPath: string[], path: string[], clickOnFile: boolean) => {
  // same file
  // or the current path is included in the path
  if (
    normalizePath(curPath) === normalizePath(path) ||
    (!clickOnFile &&
      curPath.length > path.length &&
      normalizePath(curPath.slice(0, curPath.length - (curPath.length - path.length))) === normalizePath(path))
  ) {
    return true;
  }
  return false;
};

export const dragEventBinder = (callback: (e: MouseEvent) => void) => {
  document.addEventListener('mousemove', callback);

  const mouseupEvent = () => {
    document.removeEventListener('mousemove', callback);
    document.removeEventListener('mouseup', mouseupEvent);
  };

  document.addEventListener('mouseup', mouseupEvent);
};

// eslint-disable-next-line @typescript-eslint/ban-types
export const throttle = (fn: Function, delay: number) => {
  let startTime = Date.now();
  let timer: NodeJS.Timeout | null = null;

  return function (this: unknown, ...rest: unknown[]) {
    const args = [...rest];

    const curTime = Date.now();
    const remain = delay - (curTime - startTime);

    if (timer) {
      clearTimeout(timer);
    }

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

// eslint-disable-next-line @typescript-eslint/ban-types
export const debounce = (fn: Function, delay: number, immediate = true) => {
  let timer: NodeJS.Timeout | null = null;

  return function (this: unknown, ...rest: unknown[]) {
    const args = [...rest];

    if (timer) {
      clearTimeout(timer);
    }

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
  const Window = window;

  let url = '';
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

export const hightLight = (word: string, inputs: string[], color = 'rgb(188, 54, 54)') => {
  const reg = new RegExp(`(${inputs.sort((a, b) => b.length - a.length).join('|')})`, 'gi');

  return word.replace(reg, (matchWord) => `<span style="background-color: ${color}">${matchWord}</span>`);
};

export type Themes = 'dark' | 'light' | 'soft';
export const changeTheme = (themeName: Themes) => {
  // const theme = themes[themeName as keyof typeof themes];
  const allThemes = ['light', 'dark', 'soft'];
  document.documentElement.classList.add(themeName);
  allThemes
    .filter((theme) => theme !== themeName)
    .forEach((theme) => {
      document.documentElement.classList.remove(theme);
    });
};

export const scrollToBottomListener = (container: HTMLElement, callback: () => void, bias = 3) => {
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

  container.addEventListener('scroll', fn);

  return () => {
    container.removeEventListener('scroll', fn);
  };
};

export const dateFormat = (date: Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  const config = {
    YYYY: date.getFullYear(),
    MM: date.getMonth() + 1,
    DD: date.getDate(),
    HH: date.getHours(),
    mm: date.getMinutes(),
    ss: date.getSeconds(),
  };

  for (const key in config) {
    format = format.replace(key, String(config[key as keyof typeof config]));
  }

  return format;
};

export const isEqual = (obj1: Record<string, unknown>, obj2: Record<string, unknown>) => {
  function isObject(obj: unknown) {
    return typeof obj === 'object' && obj != null;
  }
  // not object
  if (!isObject(obj1) || !isObject(obj2)) {
    return obj1 === obj2;
  }

  if (obj1 === obj2) return true;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key in obj1) {
    const res = isEqual(obj1[key] as Record<string, unknown>, obj2[key] as Record<string, unknown>);

    if (!res) return false;
  }

  return true;
};

export function headerToId(header: string) {
  return header.toLowerCase().trim().replace(/\s+/g, '-');
}

export function scrollToView(scrollContainer: HTMLElement, target: HTMLElement) {
  const topBorder = scrollContainer.scrollTop ?? 0;
  const bottomBorder = topBorder + (scrollContainer.clientHeight ?? 0);
  const offsetTop = target.offsetTop ?? 0;
  if (offsetTop < topBorder || offsetTop > bottomBorder) {
    scrollContainer.scrollTo({
      top: offsetTop,
    });
  }
}

export function updateLocationHash(hash: string) {
  const location = window.location.toString().split('#')[0];
  history.replaceState(null, '', `${location}#${hash}`);
}

export const nextTick = (fn: () => Promise<void> | void, time = 0) => {
  setTimeout(() => {
    void fn();
  }, time);
};

export async function waitAndCheck(isHit: () => boolean, wait = 50, maxTry = 10) {
  return new Promise((res) => {
    let tryCount = 0;
    const act = () => {
      if (isHit()) {
        res(true);
        return;
      }
      if (tryCount <= maxTry) {
        tryCount++;
        setTimeout(act, wait);
      } else {
        res(false);
      }
    };
    act();
  });
}

/** with the ConfirmDialog component declared in App */
export const confirm = async (props: ConfirmDialogProps) => {
  return new Promise<boolean>((resolve) => {
    confirmDialog({
      header: 'Confirmation',
      acceptLabel: 'Confirm',
      rejectLabel: 'Cancel',
      ...props,
      accept: () => {
        resolve(true);
      },
      reject: () => {
        resolve(false);
      },
    });
  });
};

export function uid(len = 5) {
  return Math.random()
    .toString(36)
    .substring(2, len + 2);
}
