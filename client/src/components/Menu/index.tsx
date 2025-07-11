import { ProgressSpinner } from 'primereact/progressspinner';
import { Tooltip } from 'primereact/tooltip';
import { FC, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
  TreeItemIndex,
  TreeItem,
  TreeRef,
} from 'react-complex-tree';
import { useSelector } from 'react-redux';

import { createRenderItem, renderItemArrow } from './renderer';
import { TreeItemData } from './type';

import { useGetNorDocsQuery } from '@/redux-api/docs';
import { DOC } from '@/redux-api/docsApiType';
import { selectCurDoc } from '@/redux-feature/curDocSlice';
import { useSaveDoc } from '@/utils/hooks/reduxHooks';
import { normalizePath } from '@/utils/utils';

import './index.scss';

const nextTick = (fn: () => Promise<void> | void, time = 0) => {
  setTimeout(() => {
    void fn();
  }, time);
};

export const Menu: FC = () => {
  const tree = useRef<TreeRef>(null);
  const menuContainer = useRef<HTMLDivElement>(null);

  const [isEnterMenu, setIsEnterMenu] = useState(false);
  const { data: docs = {}, isFetching, isSuccess, isError } = useGetNorDocsQuery();
  const { contentPath } = useSelector(selectCurDoc);
  const saveDoc = useSaveDoc();
  const renderItem = useMemo(() => createRenderItem(saveDoc, contentPath), [saveDoc, contentPath]);

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
    let parentItem = docs[contentPath]?.parent;
    if (parentItem && !Array.isArray(parentItem)) {
      nextTick(async () => {
        const expandItems = [normalizePath((parentItem as DOC).path)];
        while (!Array.isArray(parentItem)) {
          parentItem = docs[normalizePath(parentItem.path)]?.parent;
          if (!Array.isArray(parentItem)) {
            expandItems.unshift(normalizePath(parentItem.path));
          }
        }
        await tree.current?.expandSubsequently(expandItems);

        nextTick(() => {
          const topBorder = menuContainer.current?.scrollTop ?? 0;
          const bottomBorder = topBorder + (menuContainer.current?.clientHeight ?? 0);
          const offsetTop = document.getElementById(docs[contentPath].doc.id)?.offsetTop ?? 0;
          if (offsetTop < topBorder || offsetTop > bottomBorder) {
            menuContainer.current?.scrollTo({
              top: offsetTop,
            });
          }
          // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        }, 100);
      });
    }
  }, [contentPath, docs]);

  const hiddenStyle: React.CSSProperties = {
    visibility: isEnterMenu ? 'visible' : 'hidden',
  };

  let content: ReactNode = <></>;
  if (isSuccess) {
    content = (
      <div style={{ width: '100%', height: '100vh', overflow: 'auto' }} ref={menuContainer}>
        <div className="shortcut-bar">
          <Tooltip className="tool-tip" target=".collapse-all" content="Collapse All" position="bottom" />
          <i
            className="pi pi-minus-circle collapse-all"
            onClick={() => tree.current?.collapseAll()}
            style={hiddenStyle}
          ></i>
        </div>
        <UncontrolledTreeEnvironment
          dataProvider={renderData}
          getItemTitle={(item: TreeItem<TreeItemData>) => item.data.name}
          viewState={{}}
          renderItem={renderItem}
          renderItemArrow={renderItemArrow}
        >
          <Tree ref={tree} treeId="doc-menu" rootItem="root" treeLabel="Doc menu" />
        </UncontrolledTreeEnvironment>
      </div>
    );
  } else if (isFetching) {
    content = <ProgressSpinner style={{ width: '50px', height: '50px' }} />;
  } else if (isError) {
    content = <div className="error-container">Ops, something went wrong</div>;
  }

  return (
    <div
      className="menu-container"
      onMouseEnter={() => {
        setIsEnterMenu(true);
      }}
      onMouseLeave={() => {
        setIsEnterMenu(false);
      }}
    >
      {content}
    </div>
  );
};
