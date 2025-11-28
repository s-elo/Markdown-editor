export type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
  : S;
export type SnakeToCamelCaseNested<O> = O extends Record<string, unknown>
  ? {
      [key in keyof O as key extends string ? SnakeToCamelCase<key> : key]: SnakeToCamelCaseNested<O[key]>;
    }
  : O;

export type CamelToSnakeCase<S extends string> = S extends `${infer C}${infer R}`
  ? C extends Capitalize<C>
    ? `_${Uncapitalize<C>}${CamelToSnakeCase<R>}`
    : `${C}${CamelToSnakeCase<R>}`
  : S;
export type CamelToSnakeCaseNested<O> = O extends Record<string, unknown>
  ? {
      [key in keyof O as key extends string ? CamelToSnakeCase<key> : key]: CamelToSnakeCaseNested<O[key]>;
    }
  : O;

export const getSnakeCaseHandler = () => {
  const cache = new Map<string, string>();

  return <T extends string>(str: T): CamelToSnakeCase<T> | T => {
    if (!str || str.trim() === '') return str;

    if (cache.get(str)) return cache.get(str) as CamelToSnakeCase<T>;

    const ret = str.replaceAll(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);

    cache.set(str, ret);

    return ret as CamelToSnakeCase<T>;
  };
};
export const snakeCase = getSnakeCaseHandler();

export const getCamelCaseHandler = () => {
  const cache = new Map<string, string>();

  return <T extends string>(str: T): SnakeToCamelCase<T> | T => {
    if (!str || str.trim() === '') return str;

    if (cache.get(str)) return cache.get(str) as SnakeToCamelCase<T>;

    const ret = str.replaceAll(/_[a-z]/g, (match) => match.slice(1).toUpperCase());

    cache.set(str, ret);

    return ret as SnakeToCamelCase<T>;
  };
};
export const camelCase = getCamelCaseHandler();

export const transformKeyCase = (
  obj: Record<string, unknown>,
  handler: (str: string) => string,
  options?: { deep?: boolean; exclude?: string[] },
) => {
  if (typeof obj !== 'object' || obj == null) return obj;

  if (obj instanceof Date) return obj;

  const { deep = true, exclude = [] } = options ?? {};

  const result: Record<string, unknown> | unknown[] = Array.isArray(obj) ? [] : {};
  Object.keys(obj).forEach((key) => {
    result[exclude.includes(key) ? key : handler(key)] = deep
      ? transformKeyCase(obj[key] as Record<string, unknown>, handler, options)
      : obj[key];
  });

  return result;
};
