import { ContextMenu } from 'primereact/contextmenu';
import { MenuItem as PrimeMenuItem } from 'primereact/menuitem';
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

import { useNewDocItem, usePasteDoc } from './operations';
import { createRenderItem, renderItemArrow } from './renderer';
import { TreeDataCtx, TreeRefCtx, TreeItemData } from './type';

import { useGetDocMenuQuery, useGetNorDocsQuery } from '@/redux-api/docs';
import { DOC } from '@/redux-api/docsApiType';
import { selectCurDoc } from '@/redux-feature/curDocSlice';
import { selectOperationMenu } from '@/redux-feature/operationMenuSlice';
import { normalizePath, nextTick } from '@/utils/utils';

import './index.scss';

export const Menu: FC = () => {
  const tree = useRef<TreeRef>(null);
  const menuContainer = useRef<HTMLDivElement>(null);
  const cm = useRef<ContextMenu>(null);

  const [isEnterMenu, setIsEnterMenu] = useState(false);
  const { data: docs = {}, isFetching, isSuccess, isError } = useGetNorDocsQuery();
  const { data: treeDocs = [] } = useGetDocMenuQuery();
  const { contentPath } = useSelector(selectCurDoc);
  const { copyPath, cutPath } = useSelector(selectOperationMenu);

  const renderItem = useMemo(() => createRenderItem(), []);

  const createNewDocItem = useNewDocItem();
  const pasteDoc = usePasteDoc();

  const renderData = useMemo(() => {
    const docIdx = Object.keys(docs);

    const root: Record<TreeItemIndex, TreeItem<TreeItemData>> = {
      root: {
        index: 'root',
        canMove: false,
        isFolder: true,
        // first level sorted docs
        children: treeDocs.map((d) => normalizePath(d.path)),
        canRename: false,
        data: { path: [], id: 'root', name: 'root', parentIdx: '' },
      },
    };

    return docIdx.reduce((treeData, idx) => {
      const { isFile, children, path, id, name } = docs[idx].doc;
      const parentItem = docs[idx].parent;
      const parentIdx = Array.isArray(parentItem) ? 'root' : normalizePath(parentItem.path);
      treeData[idx] = {
        index: idx,
        canMove: true,
        isFolder: !isFile,
        children: children.map((d) => normalizePath(d.path)),
        canRename: true,
        data: { path, id, name, parentIdx },
      };
      return treeData;
    }, root);
  }, [docs, treeDocs]);
  const treeDataProvider = useMemo(() => new StaticTreeDataProvider(renderData), [renderData]);

  useEffect(() => {
    nextTick(async () => treeDataProvider.onDidChangeTreeDataEmitter.emit(['root', ...Object.keys(docs)]));
    // void treeDataProvider.onDidChangeTreeDataEmitter.emit(['root', ...Object.keys(docs)]);
  }, [treeDataProvider]);

  useEffect(() => {
    let parentItem = docs[contentPath]?.parent;
    if (parentItem && !Array.isArray(parentItem)) {
      const fn = async () => {
        const expandItems = [normalizePath((parentItem as DOC).path)];
        while (!Array.isArray(parentItem)) {
          parentItem = docs[normalizePath(parentItem.path)]?.parent;
          if (!Array.isArray(parentItem)) {
            expandItems.unshift(normalizePath(parentItem.path));
          }
        }
        await tree.current?.expandSubsequently(expandItems);

        // FIXME: any better way to determine when the children have been rendered?
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
      };
      nextTick(fn);
      // void fn();
    }
  }, [contentPath, docs]);

  const hiddenStyle: React.CSSProperties = {
    visibility: isEnterMenu ? 'visible' : 'hidden',
  };

  const rootContextMenuItems: PrimeMenuItem[] = [
    {
      label: 'New File',
      icon: 'pi pi-file',
      command: () => {
        void createNewDocItem(renderData.root, false, treeDataProvider, renderData);
      },
    },
    {
      label: 'New Folder',
      icon: 'pi pi-folder',
      command: () => {
        void createNewDocItem(renderData.root, true, treeDataProvider, renderData);
      },
    },
    {
      label: 'Paste',
      icon: 'pi pi-clipboard',
      disabled: !(copyPath || cutPath),
      command: () => {
        void pasteDoc([]);
      },
    },
  ];
  const onRightClick = (event: React.MouseEvent): void => {
    if (cm.current) {
      // clear the last one
      document.body.click();
      cm.current.show(event);
    }
  };

  let content: ReactNode = <></>;
  if (isSuccess) {
    content = (
      <div style={{ width: '100%', height: '100vh', overflow: 'auto' }} ref={menuContainer}>
        <div
          className="shortcut-bar"
          onContextMenu={(e) => {
            e.stopPropagation();
          }}
        >
          <Tooltip className="tool-tip" target=".collapse-all" content="Collapse All" position="bottom" />
          <i
            className="pi pi-minus-circle collapse-all"
            onClick={() => tree.current?.collapseAll()}
            style={hiddenStyle}
          ></i>
        </div>
        <ContextMenu ref={cm} model={rootContextMenuItems} />
        <UncontrolledTreeEnvironment
          dataProvider={treeDataProvider}
          getItemTitle={(item: TreeItem<TreeItemData>) => item.data.name}
          viewState={{}}
          renderItem={renderItem}
          renderItemArrow={renderItemArrow}
          canSearchByStartingTyping={false}
        >
          <Tree ref={tree} treeId="tree-id" rootItem="root" treeLabel="Doc menu" />
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
      onContextMenu={onRightClick}
      onMouseEnter={() => {
        setIsEnterMenu(true);
      }}
      onMouseLeave={() => {
        setIsEnterMenu(false);
      }}
    >
      <TreeDataCtx.Provider
        value={{
          provider: treeDataProvider,
          data: renderData,
        }}
      >
        <TreeRefCtx.Provider value={tree.current}>{content}</TreeRefCtx.Provider>
      </TreeDataCtx.Provider>
    </div>
  );
};
