export const headerToId = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-');

export const updateLocationHash = (id: string) => {
  window.history.replaceState(null, '', `#${encodeURIComponent(id)}`);
};

export const throttle = (fn: () => void, delay: number) => {
  let startTime = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    const remain = delay - (Date.now() - startTime);
    if (timer) clearTimeout(timer);
    if (remain <= 0) {
      fn();
      startTime = Date.now();
      return;
    }
    timer = setTimeout(() => {
      fn();
      timer = null;
      startTime = Date.now();
    }, remain);
  };
};

export const nextTick = (callback: () => void) => setTimeout(callback, 0);

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
export const uid = () => Math.random().toString(36).slice(2);
