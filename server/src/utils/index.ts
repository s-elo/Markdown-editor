import path from 'path';

export const projectRoot = (...args: string[]) => path.resolve(__dirname, '../../../', ...args);

export const normalizePath = (pathArr: string[]) => encodeURIComponent(pathArr.join('/'));

export const denormalizePath = (pathStr: string) => decodeURIComponent(pathStr).split('/');
