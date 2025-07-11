import { DOC } from '@/redux-api/docsApiType';

export type TreeItemData = Pick<DOC, 'id' | 'name' | 'path'>;
