import { ProgressSpinner } from 'primereact/progressspinner';
import { FC, useEffect, useMemo } from 'react';
import { UncontrolledTreeEnvironment, Tree, StaticTreeDataProvider, TreeItemIndex, TreeItem } from 'react-complex-tree';

import { createRenderItem, renderItemArrow } from './renderer';
import { TreeItemData } from './type';

import { useGetNorDocsQuery } from '@/redux-api/docs';
import { useSaveDoc } from '@/utils/hooks/reduxHooks';
import { normalizePath } from '@/utils/utils';

import './Index.scss';

export const Menu: FC = () => {
  const { data: docs = {}, isFetching, isSuccess, isError } = useGetNorDocsQuery();
  const saveDoc = useSaveDoc();

  const renderItem = createRenderItem(saveDoc);

  const renderData = useMemo(() => {
    const docIdx = Object.keys(docs);

    const root: Record<TreeItemIndex, TreeItem<TreeItemData>> = {
      root: {
        index: 'root',
        canMove: false,
        isFolder: true,
        // first level docs
        children: docIdx.filter((i) => docs[i].doc.path.length === 1),
        canRename: false,
        data: { path: [], id: 'root', name: 'root' },
      },
    };

    docIdx.reduce((treeData, idx) => {
      const { isFile, children, path, id, name } = docs[idx].doc;
      treeData[idx] = {
        index: idx,
        canMove: true,
        isFolder: !isFile,
        children: children.map((d) => normalizePath(d.path)),
        canRename: true,
        data: { path, id, name },
      };
      return treeData;
    }, root);

    return new StaticTreeDataProvider(root);
  }, [docs]);

  useEffect(() => {
    void renderData.onDidChangeTreeDataEmitter.emit(['root']);
  }, [renderData]);

  let content: JSX.Element = <></>;
  if (isSuccess) {
    content = (
      <div style={{ width: '100%', height: '100vh', overflow: 'auto' }}>
        <UncontrolledTreeEnvironment
          dataProvider={renderData}
          getItemTitle={(item: TreeItem<TreeItemData>) => item.data.name}
          viewState={{}}
          renderItem={renderItem}
          renderItemArrow={renderItemArrow}
        >
          <Tree treeId="doc-menu" rootItem="root" treeLabel="Doc menu" />
        </UncontrolledTreeEnvironment>
      </div>
    );
  } else if (isFetching) {
    content = <ProgressSpinner style={{ width: '50px', height: '50px' }} />;
  } else if (isError) {
    content = <div className="error-container">Ops, something went wrong</div>;
  }

  return <div className="menu-container">{content}</div>;
};
