import path from 'path';

export * from './case';

export const projectRoot = (...args: string[]) => path.resolve(__dirname, '../../../', ...args);

export const serverSrc = (...args: string[]) => path.resolve(__dirname, '..', ...args);

export const serverRoot = (...args: string[]) => path.resolve(__dirname, '..', '..', ...args);

export const normalizePath = (pathArr: string[]) => encodeURIComponent(pathArr.join('/'));

export const denormalizePath = (pathStr: string) => decodeURIComponent(pathStr).split('/');
