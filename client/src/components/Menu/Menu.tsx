import { ContextMenu } from 'primereact/contextmenu';
import { MenuItem as PrimeMenuItem } from 'primereact/menuitem';
import { ProgressSpinner } from 'primereact/progressspinner';
import { ScrollPanel } from 'primereact/scrollpanel';
import { Tooltip } from 'primereact/tooltip';
import { FC, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
  TreeItemIndex,
  TreeItem,
  TreeRef,
  DraggingPosition,
  TreeEnvironmentRef,
} from 'react-complex-tree';
import { useSelector, useDispatch } from 'react-redux';

import { Empty } from './Empty';
import { useDropDoc, useNewDocItem, usePasteDoc, useUpdateSubDocItems } from './operations';
import { createRenderItem, renderDragBetweenLine, renderItemArrow } from './renderer';
import { Shortcut } from './Shortcut';
import { TreeDataCtx, TreeRefCtx, TreeItemData, MenuCtx, TreeEnvRefCtx } from './type';

import { useGetDocSubItemsQuery } from '@/redux-api/docs';
import { useGetSettingsQuery } from '@/redux-api/settings';
import { selectCurDoc } from '@/redux-feature/curDocSlice';
import { selectServerStatus, ServerStatus } from '@/redux-feature/globalOptsSlice';
import { selectOperationMenu, updateSelectedItems } from '@/redux-feature/operationMenuSlice';
import { normalizePath, scrollToView, waitAndCheck, denormalizePath } from '@/utils/utils';

import './Menu.scss';

export const Menu: FC = () => {
  const tree = useRef<TreeRef>(null);
  const treeEnvRef = useRef<TreeEnvironmentRef>(null);
  const menuContainer = useRef<HTMLDivElement>(null);
  const cm = useRef<ContextMenu>(null);

  const [isEnterMenu, setIsEnterMenu] = useState(false);
  const { data: docRootItems = [], isFetching, isSuccess, isError, error } = useGetDocSubItemsQuery();
  const updateSubDocItems = useUpdateSubDocItems();

  const { contentIdent: contentPath } = useSelector(selectCurDoc);
  const { copyCutPaths } = useSelector(selectOperationMenu);
  const serverStatus = useSelector(selectServerStatus);
  const { data: settings } = useGetSettingsQuery();

  const dispatch = useDispatch();

  const renderItem = useMemo(() => createRenderItem(), []);

  const createNewDocItem = useNewDocItem();
  const pasteDoc = usePasteDoc();
  const dropDoc = useDropDoc();

  const renderData = useMemo(() => {
    const root: Record<TreeItemIndex, TreeItem<TreeItemData>> = {
      root: {
        index: 'root',
        canMove: false,
        isFolder: true,
        // first level sorted docs
        children: docRootItems.map((d) => normalizePath(d.path)),
        canRename: false,
        data: { path: [], id: 'root', name: 'root', parentIdx: '' },
      },
    };

    // the reset of sub docs will be reqeusted in require(when expanding)
    return docRootItems.reduce((treeData, docRootItem) => {
      const { path, id, name, isFile } = docRootItem;
      const parentIdx = 'root';
      const idx = normalizePath(path);
      treeData[idx] = {
        index: idx,
        canMove: true,
        isFolder: !isFile,
        children: [],
        canRename: true,
        data: { path, id, name, parentIdx },
      };
      return treeData;
    }, root);
  }, [docRootItems, isFetching]);
  const treeDataProvider = useMemo(() => new StaticTreeDataProvider(renderData), [renderData]);

  const selectedItemPathKeys = useMemo(() => {
    const selectedDocPath = denormalizePath(contentPath);
    return selectedDocPath.reduce<string[]>((pathKeys, pathItem, idx) => {
      if (idx - 1 < 0) {
        pathKeys.push(pathItem);
      } else if (pathKeys[idx - 1]) {
        pathKeys.push(`${pathKeys[idx - 1]}${normalizePath(`/${pathItem}`)}`);
      }
      return pathKeys;
    }, []);
  }, [contentPath]);

  useEffect(() => {
    void treeDataProvider.onDidChangeTreeDataEmitter.emit(['root']);
  }, [treeDataProvider]);

  useEffect(() => {
    if (contentPath) {
      const fn = async () => {
        const expandKeys = selectedItemPathKeys.slice(0, -1);
        // TODO: request sub docs in parallel, may need to wait for the parent doc logics
        for (const docIdx of expandKeys) {
          const docItem = renderData[docIdx];
          if (!docItem || docItem.children?.length) continue;
          await updateSubDocItems(docItem, renderData, treeDataProvider);
        }

        // FIXME: any better way to determine when the tree ref is available?
        const hasTree = await waitAndCheck(() => Boolean(tree.current));
        if (!hasTree) return;

        if (expandKeys.length) {
          await tree.current?.expandSubsequently(expandKeys);
        }

        const selectdItemPath = selectedItemPathKeys[selectedItemPathKeys.length - 1];
        tree.current?.selectItems([selectdItemPath]);

        const selectedItem = renderData[selectdItemPath];
        if (!selectedItem) return;
        // FIXME: any better way to determine when the children have been rendered?
        const hasChildren = await waitAndCheck(() =>
          Boolean(
            document.querySelector('.menu-wrapper .p-scrollpanel-content') &&
              document.getElementById(selectedItem.data.id),
          ),
        );
        if (!hasChildren) return;

        const scrollContainer = document.querySelector('.menu-wrapper .p-scrollpanel-content');
        const target = document.getElementById(selectedItem.data.id);
        if (!scrollContainer || !target) return;
        scrollToView(scrollContainer as HTMLElement, target);
      };
      void fn();
    }
  }, [selectedItemPathKeys, renderData, treeDataProvider]);

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
        void pasteDoc({
          pasteParentPathArr: [],
          providedTreeDataCtx: { data: renderData, provider: treeDataProvider },
        });
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
    return dropDoc({ items, target, treeData: renderData, treeProvider: treeDataProvider });
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

  const onExpandItem = async (item: TreeItem<TreeItemData>) => {
    // already fetched
    if (item.children?.length) return;

    await updateSubDocItems(item, renderData, treeDataProvider);
  };

  let content: ReactNode = <></>;
  if (isSuccess) {
    if (!settings?.docRootPath) {
      content = <Empty />;
    } else {
      content = (
        <div style={{ width: '100%', height: '100%' }} ref={menuContainer}>
          <Shortcut visible={isEnterMenu} tree={tree} />
          <ContextMenu ref={cm} model={rootContextMenuItems} />
          <ScrollPanel className="menu-wrapper" onClick={onClickMenuContainer}>
            <UncontrolledTreeEnvironment
              ref={treeEnvRef}
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
              onExpandItem={(item) => {
                void onExpandItem(item);
              }}
              canDropAt={(items, target) => {
                const targetItem = target.targetType === 'between-items' ? target.parentItem : target.targetItem;
                const isAlreadyInTarget = items.find((item) => renderData[targetItem].children?.includes(item.index));
                if (isAlreadyInTarget) return false;
                if (renderData[targetItem]?.isFolder) return true;
                return false;
              }}
            >
              <Tree ref={tree} treeId="treeId" rootItem="root" treeLabel="Doc menu" />
            </UncontrolledTreeEnvironment>
          </ScrollPanel>
        </div>
      );
    }
  } else if (isFetching) {
    content = <ProgressSpinner style={{ width: '50px', height: '50px' }} />;
  } else if (isError) {
    if (serverStatus === ServerStatus.RUNNING) {
      content = (
        <div className="error-container">
          <Tooltip target=".error-container-title" />
          <div className="error-container-title" data-pr-tooltip={JSON.stringify(error)} data-pr-position="top">
            Ops, something went wrong
          </div>
        </div>
      );
    } else {
      // should install the server to select workspace
      content = <Empty />;
    }
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
      <MenuCtx.Provider value={{ isEnterMenu }}>
        <TreeDataCtx.Provider
          value={{
            provider: treeDataProvider,
            data: renderData,
          }}
        >
          <TreeRefCtx.Provider value={tree.current}>
            <TreeEnvRefCtx.Provider value={treeEnvRef.current}>{content}</TreeEnvRefCtx.Provider>
          </TreeRefCtx.Provider>
        </TreeDataCtx.Provider>
      </MenuCtx.Provider>
    </div>
  );
};
