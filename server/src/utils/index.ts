import path from 'path';

export const projectRoot = (...args: string[]) => path.resolve(__dirname, '../../../', ...args);
