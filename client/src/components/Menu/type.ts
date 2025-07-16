import { createContext } from 'react';
import { StaticTreeDataProvider, TreeItem, TreeItemIndex, TreeRef } from 'react-complex-tree';

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

export const TreeRefCtx = createContext<TreeRef | null>(null);
