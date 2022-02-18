export const localStore = (key: string) => {
  const value = window.localStorage.getItem(key);

  const setStore = (val: string) => window.localStorage.setItem(key, val);

  return { value, setStore };
};
