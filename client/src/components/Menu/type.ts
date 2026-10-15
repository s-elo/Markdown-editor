import { createContext } from 'react';
import { StaticTreeDataProvider, TreeEnvironmentRef, TreeItem, TreeItemIndex } from 'react-complex-tree';

import { DocTreeNode } from '@/redux-api/docsApiType';

export interface MetaData {
  childrenLoaded?: boolean;
  newFile?: boolean;
  newFolder?: boolean;
  rename?: boolean;
}

export type TreeItemData = MetaData & Pick<DocTreeNode, 'id' | 'name' | 'path'> & { parentIdx: TreeItemIndex };

export const TreeDataCtx = createContext<{
  provider: StaticTreeDataProvider<TreeItemData>;
  data: Record<TreeItemIndex, TreeItem<TreeItemData>>;
} | null>(null);

export const TreeEnvRefCtx = createContext<TreeEnvironmentRef | null>(null);
export const MenuCtx = createContext<{
  isEnterMenu: boolean;
}>({ isEnterMenu: false });
