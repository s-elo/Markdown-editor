import { ContextMenu } from 'primereact/contextmenu';
import { MenuItem as PrimeMenuItem } from 'primereact/menuitem';
import { ProgressSpinner } from 'primereact/progressspinner';
import { ScrollPanel } from 'primereact/scrollpanel';
import { FC, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
  TreeItemIndex,
  TreeItem,
  TreeRef,
  DraggingPosition,
} from 'react-complex-tree';
import { useSelector, useDispatch } from 'react-redux';

import { useDropDoc, useNewDocItem, usePasteDoc } from './operations';
import { createRenderItem, renderDragBetweenLine, renderItemArrow } from './renderer';
import { Shortcut } from './Shortcut';
import { TreeDataCtx, TreeRefCtx, TreeItemData } from './type';

import { useGetDocMenuQuery, useGetNorDocsQuery } from '@/redux-api/docs';
import { NormalizedDoc } from '@/redux-api/docsApiType';
import { selectCurDoc } from '@/redux-feature/curDocSlice';
import { selectOperationMenu, updateSelectedItems } from '@/redux-feature/operationMenuSlice';
import { normalizePath, nextTick, scrollToView, waitAndCheck } from '@/utils/utils';

import './Menu.scss';

export const Menu: FC = () => {
  const tree = useRef<TreeRef>(null);
  const menuContainer = useRef<HTMLDivElement>(null);
  const cm = useRef<ContextMenu>(null);

  const [isEnterMenu, setIsEnterMenu] = useState(false);
  const { data: docs = {}, isFetching, isSuccess, isError } = useGetNorDocsQuery();
  const { data: treeDocs = [] } = useGetDocMenuQuery();
  const { contentPath } = useSelector(selectCurDoc);
  const { copyCutPaths } = useSelector(selectOperationMenu);

  const dispatch = useDispatch();

  const renderItem = useMemo(() => createRenderItem(), []);

  const createNewDocItem = useNewDocItem();
  const pasteDoc = usePasteDoc();
  const dropDoc = useDropDoc();

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
      const { isFile, childrenKeys, path, id, name } = docs[idx];
      const parentIdx = !docs[idx].parentKey ? 'root' : normalizePath(docs[docs[idx].parentKey].path);
      treeData[idx] = {
        index: idx,
        canMove: true,
        isFolder: !isFile,
        children: [...childrenKeys],
        canRename: true,
        data: { path, id, name, parentIdx },
      };
      return treeData;
    }, root);
  }, [docs, treeDocs]);
  const treeDataProvider = useMemo(() => new StaticTreeDataProvider(renderData), [renderData]);

  const expendItem = useCallback(
    async (item: NormalizedDoc['']) => {
      let parentKey = item.parentKey;
      if (parentKey) {
        const expandItems = [parentKey];
        while (parentKey) {
          parentKey = docs[parentKey].parentKey;
          if (parentKey) {
            expandItems.unshift(parentKey);
          }
        }

        await tree.current?.expandSubsequently(expandItems);
      }
    },
    [tree, docs],
  );

  useEffect(() => {
    nextTick(async () => treeDataProvider.onDidChangeTreeDataEmitter.emit(['root', ...Object.keys(docs)]));
    // void treeDataProvider.onDidChangeTreeDataEmitter.emit(['root', ...Object.keys(docs)]);
  }, [treeDataProvider]);

  useEffect(() => {
    if (contentPath) {
      const fn = async () => {
        if (!docs[contentPath]) return;
        // FIXME: any better way to determine when the children have been rendered?
        const hasTree = await waitAndCheck(() => Boolean(tree?.current));
        if (!hasTree) return;
        tree.current?.selectItems([contentPath]);

        await expendItem(docs[contentPath]);

        const hasChildren = await waitAndCheck(() =>
          Boolean(
            document.querySelector('.menu-wrapper .p-scrollpanel-content') &&
              document.getElementById(docs[contentPath].id),
          ),
        );
        if (!hasChildren) return;

        const scrollContainer = document.querySelector('.menu-wrapper .p-scrollpanel-content');
        const target = document.getElementById(docs[contentPath].id);
        if (!scrollContainer || !target) return;
        scrollToView(scrollContainer as HTMLElement, target);
      };
      nextTick(fn);
      // void fn();
    }
  }, [contentPath, docs]);

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
      disabled: !copyCutPaths.length,
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

  const onDrop = async (items: TreeItem<TreeItemData>[], target: DraggingPosition) => {
    return dropDoc({ items, target, renderData, treeDocs, docs });
  };

  const onSelectItems = (items: TreeItemIndex[]) => {
    dispatch(updateSelectedItems(items as string[]));
  };

  const onClickMenuContainer = (e: React.MouseEvent) => {
    if (e.target === document.querySelector('.menu-wrapper .p-scrollpanel-content')) {
      // clear the selected items
      tree.current?.selectItems([]);
    }
  };

  let content: ReactNode = <></>;
  if (isSuccess) {
    content = (
      <div style={{ width: '100%', height: '100%' }} ref={menuContainer}>
        <Shortcut visible={isEnterMenu} tree={tree} />
        <ContextMenu ref={cm} model={rootContextMenuItems} />
        <ScrollPanel className="menu-wrapper" onClick={onClickMenuContainer}>
          <UncontrolledTreeEnvironment
            onSelectItems={onSelectItems}
            dataProvider={treeDataProvider}
            getItemTitle={(item: TreeItem<TreeItemData>) => item.data.name}
            viewState={{}}
            renderItem={renderItem}
            renderItemArrow={renderItemArrow}
            renderDragBetweenLine={renderDragBetweenLine}
            canSearchByStartingTyping={false}
            canDragAndDrop={true}
            canReorderItems={true}
            canDropOnFolder={true}
            canDropOnNonFolder={true}
            onDrop={(...args) => void onDrop(...args)}
            canDropAt={(items, target) => {
              const targetItem = target.targetType === 'between-items' ? target.parentItem : target.targetItem;
              const isAlreadyInTarget = items.find((item) => renderData[targetItem].children?.includes(item.index));
              if (isAlreadyInTarget) return false;
              if (renderData[targetItem]?.isFolder) return true;
              return false;
            }}
          >
            <Tree ref={tree} treeId="tree-id" rootItem="root" treeLabel="Doc menu" />
          </UncontrolledTreeEnvironment>
        </ScrollPanel>
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
