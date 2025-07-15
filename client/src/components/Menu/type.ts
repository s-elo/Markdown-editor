import { createContext } from 'react';
import { StaticTreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree';

import { DOC } from '@/redux-api/docsApiType';

export interface MetaData {
  newFile?: boolean;
  newFolder?: boolean;
  rename?: boolean;
}

export type TreeItemData = MetaData & Pick<DOC, 'id' | 'name' | 'path'> & { parentIdx: TreeItemIndex };

export const TreeDataCtx = createContext<{
  provider: StaticTreeDataProvider<TreeItemData>;
  data: Record<TreeItemIndex, TreeItem<TreeItemData>>;
} | null>(null);
