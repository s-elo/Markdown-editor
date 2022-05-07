import React, { useState, useRef, useCallback, useEffect } from "react";
import { throttle } from "./utils";

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
  }, deps);
};
