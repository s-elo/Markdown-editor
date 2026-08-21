/* eslint-disable @typescript-eslint/no-magic-numbers */
import { QueryStatus } from '@reduxjs/toolkit/query';
import { InputText } from 'primereact/inputtext';
import { FC, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { DraggingPosition, StaticTreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { TreeDataCtx, TreeItemData, TreeRefCtx } from './type';

import { selectCurDocDirty, updateCurDoc } from '@/redux-feature/curDocSlice';
import { selectOperationMenu, selectSelectedItemIds, updateCopyCut } from '@/redux-feature/operationMenuSlice';
import { useCurPath } from '@/utils/hooks/docHooks';
import { useDeleteTab, useRenameTab, useRenameTabs } from '@/utils/hooks/reduxHooks';
import {
  useCopyCutWorkspaceDocs,
  useCreateWorkspaceDoc,
  useDeleteWorkspaceDocs,
  useLazyWorkspaceSubItemsQuery,
  useRenameWorkspaceDoc,
} from '@/utils/hooks/workspaceHooks';
import Toast from '@/utils/Toast';
import { confirm, denormalizePath, isPathsRelated, normalizePath } from '@/utils/utils';

export function deleteSubDocItem(
  parentItem: TreeItem<TreeItemData>,
  idx: TreeItemIndex,
  treeData: Record<TreeItemIndex, TreeItem<TreeItemData>>,
) {
  if (!parentItem.children?.length) return;

  parentItem.children = parentItem.children.filter((childIdx) => childIdx !== idx);

  const item = treeData[idx];
  if (!item) return true;

  const isFolder = item.isFolder;
  if (isFolder) {
    item.children?.forEach((childIdx) => {
      deleteSubDocItem(item, childIdx, treeData);
    });
  }

  if (treeData[idx]) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete treeData[idx];
  }

  return true;
}

export const useUpdateSubDocItems = () => {
  const [getDocSubItems] = useLazyWorkspaceSubItemsQuery();

  return async (
    parentItem: TreeItem<TreeItemData>,
    treeData: Record<TreeItemIndex, TreeItem<TreeItemData>>,
    provider: StaticTreeDataProvider<TreeItemData>,
  ) => {
    const currentParentItem = treeData[parentItem.index];
    if (!currentParentItem) return;

    const { data: newSubItems, status } = await getDocSubItems({
      folderDocPath: currentParentItem.data.path.join('/'),
    });
    if (status !== QueryStatus.fulfilled) {
      Toast.error('Failed to get sub doc items');
      return;
    }

    newSubItems.forEach(({ id, name, isFile, path }) => {
      const idx = normalizePath(path);
      if (treeData[idx]) return;
      treeData[idx] = {
        index: idx,
        canMove: true,
        isFolder: !isFile,
        children: [],
        canRename: true,
        data: { path, id, name, parentIdx: currentParentItem.index },
      };
    });
    currentParentItem.children = newSubItems.map((d) => normalizePath(d.path));
    await provider.onDidChangeTreeDataEmitter.emit([currentParentItem.index, ...currentParentItem.children]);
  };
};

export const useNewDocItem = () => {
  const treeDataCtx = useContext(TreeDataCtx);
  const treeRefCtx = useContext(TreeRefCtx);

  return async (
    item: TreeItem<TreeItemData>,
    isFolder: boolean,
    // for root menu to provide
    treeProvider?: StaticTreeDataProvider<TreeItemData>,
    renderData?: Record<TreeItemIndex, TreeItem<TreeItemData>>,
  ) => {
    const treeData = renderData ?? treeDataCtx?.data;
    const provider = treeProvider ?? treeDataCtx?.provider;
    if (!treeData || !provider) return;

    const id = `${Math.random()}`;
    const newItem: TreeItem<TreeItemData> = {
      index: id,
      canMove: false,
      isFolder,
      children: [],
      canRename: false,
      data: {
        parentIdx: item.index,
        path: [],
        id,
        name: 'newDoc',
        newFile: !isFolder,
        newFolder: isFolder,
      },
    };
    treeData[id] = newItem;
    item.children?.unshift(id);

    await provider.onDidChangeTreeDataEmitter.emit([item.index]);

    treeRefCtx?.expandItem(item.index);
  };
};

export const deleteDocItem = async (
  treeProvider: StaticTreeDataProvider<TreeItemData>,
  treeData: Record<TreeItemIndex, TreeItem<TreeItemData>>,
  deleteItems: {
    parentItem: TreeItem<TreeItemData>;
    idx: TreeItemIndex;
  }[],
) => {
  deleteItems.forEach(({ parentItem, idx }) => {
    if (!parentItem.children?.length) return;

    parentItem.children = parentItem.children.filter((childIdx) => childIdx !== idx);
    if (treeData[idx]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete treeData[idx];
    }
  });

  await treeProvider.onDidChangeTreeDataEmitter.emit(deleteItems.map(({ parentItem }) => parentItem.index));
};

export const useDeleteEffect = () => {
  const { curPath } = useCurPath();

  const { copyCutPaths } = useSelector(selectOperationMenu);
  const isDirty = useSelector(selectCurDocDirty);

  const dispatch = useDispatch();

  const deleteTab = useDeleteTab();

  return (deleteInfo: { filePath: string; isFile: boolean }[], force = false) => {
    // clear the previous copy and cut
    dispatch(
      updateCopyCut({
        copyCutPaths: copyCutPaths.filter((copyCutPath) => !deleteInfo.find((d) => d.filePath === copyCutPath)),
      }),
    );

    // jump if the current doc is deleted or included in the deleted folder
    if (deleteInfo.some(({ filePath, isFile }) => isPathsRelated(curPath, denormalizePath(filePath), isFile))) {
      // clear global curDoc info
      if (isDirty) {
        dispatch(
          updateCurDoc({
            content: '',
            isDirty: false,
            contentIdent: '',
            scrollTop: 0,
            headings: [],
            syncTab: false,
            type: 'workspace',
          }),
        );
      }
    }

    void deleteTab(
      deleteInfo.map((d) => d.filePath),
      { force },
    );
  };
};

export const useDeleteDoc = () => {
  const deleteDocMutation = useDeleteWorkspaceDocs();
  const treeDataCtx = useContext(TreeDataCtx);

  const selectedItemIds = useSelector(selectSelectedItemIds);

  const deleteEffect = useDeleteEffect();

  return async (item: TreeItem<TreeItemData>) => {
    if (!treeDataCtx) return;
    const { provider, data: treeData } = treeDataCtx;

    const deletedItems = selectedItemIds.includes(item.index as string)
      ? selectedItemIds.map((id) => treeData[id])
      : [item];
    const isConfirm = await confirm({
      message: `Are you sure to delete ${
        deletedItems
          .reduce<string[]>((ret, i) => {
            ret.push(i.data.name);
            return ret;
          }, [])
          .join(', ') as string
      }?`,
      acceptLabel: 'Delete',
    });
    if (!isConfirm) return;

    try {
      const deletePayload = deletedItems.map((deletedItem) => {
        const { isFolder } = deletedItem;
        const { path } = deletedItem.data;
        const deletedPath = normalizePath(path);

        return { filePath: deletedPath, isFile: !isFolder };
      });

      await deleteDocMutation(deletePayload);
      deleteEffect(deletePayload, true);

      await Promise.all(
        deletedItems.map(async (i) => {
          const parentItem = treeData[i.data.parentIdx];
          if (!parentItem) return;

          await deleteDocItem(provider, treeData, [{ parentItem, idx: i.index }]);
        }),
      );
      Toast('deleted successfully!');
    } catch (err) {
      Toast.error((err as Error).message);
    }
  };
};

export const useRenameDoc = () => {
  const treeDataCtx = useContext(TreeDataCtx);

  return async (item: TreeItem<TreeItemData>) => {
    item.data.rename = true;
    // trigger to re-render as rename item component
    await treeDataCtx?.provider.onDidChangeTreeDataEmitter.emit([item.index]);
  };
};

export const useCopyCutDoc = () => {
  const dispatch = useDispatch();
  const selectedItemIds = useSelector(selectSelectedItemIds);

  return (copyCutPaths: string[], isCopy: boolean) => {
    dispatch(
      updateCopyCut({
        // if the copyCutPaths is not selected, then just copyCut the copyCutPaths
        copyCutPaths: selectedItemIds.includes(copyCutPaths[0]) ? selectedItemIds : copyCutPaths,
        isCopy,
      }),
    );
  };
};

export const usePasteDoc = () => {
  const treeDataCtx = useContext(TreeDataCtx);

  const dispatch = useDispatch();
  const { isCopy: globalIsCopy, copyCutPaths } = useSelector(selectOperationMenu);
  const [getDocSubItems] = useLazyWorkspaceSubItemsQuery();

  const copyCutDoc = useCopyCutWorkspaceDocs();
  const renameTabs = useRenameTabs();

  const updateSubDocItems = useUpdateSubDocItems();

  return async ({
    pasteParentPathArr,
    providedTreeDataCtx,
    providedIsCopy,
    providedCopyCutPaths,
    providedCopyCutItems,
    onCancel,
  }: {
    /** the path of the clicked item */
    pasteParentPathArr: string[];
    providedTreeDataCtx?: {
      provider: StaticTreeDataProvider<TreeItemData>;
      data: Record<TreeItemIndex, TreeItem<TreeItemData>>;
    };
    providedIsCopy?: boolean;
    /** normalized */
    providedCopyCutPaths?: string[];
    /** Stable drag snapshots; rendered tree data can be replaced while a drag is in progress. */
    providedCopyCutItems?: TreeItem<TreeItemData>[];
    onCancel?: () => Promise<void> | void;
  }) => {
    const treeCtx = providedTreeDataCtx ?? treeDataCtx;
    if (!treeCtx) return;
    const { data: treeData, provider } = treeCtx;

    const isCopy = providedIsCopy ?? globalIsCopy;

    try {
      const { data: pasteParentSubDocs, status } = await getDocSubItems({
        folderDocPath: pasteParentPathArr.join('/'),
      });
      if (status !== QueryStatus.fulfilled) {
        Toast.error('Failed to get sub doc items');
        return;
      }

      const providedItemsByPath = new Map(
        providedCopyCutItems?.map((item) => [normalizePath(item.data.path), item] as const) ?? [],
      );
      const sourceNames = new Map<string, string>();
      const copyCutPayload = (providedCopyCutPaths ?? copyCutPaths)
        .flatMap((copyCutPath) => {
          // Prefer the drag snapshot. The provider may already have optimistically detached the source node.
          const copyCutItem = providedItemsByPath.get(copyCutPath) ?? treeData[copyCutPath];
          if (!copyCutItem) {
            Toast.warn(`${denormalizePath(copyCutPath).join('/')} is no longer available`);
            return [];
          }
          const copyCutDocName = copyCutItem.data.name;
          sourceNames.set(copyCutPath, copyCutDocName);

          const pasteParentPath = normalizePath(pasteParentPathArr);
          const pasteDoc = treeData[pasteParentPath];
          // click on file or not
          const pastePath = pasteDoc
            ? normalizePath(pasteParentPathArr.concat(copyCutDocName))
            : // paster to root
              copyCutDocName;

          return [{ copyCutPath, pastePath, isCopy, isFile: !copyCutItem.isFolder }];
        })
        .filter(({ pastePath, copyCutPath }) => {
          // check if there is a repeat name
          const hasDuplicatedName = pasteParentSubDocs.some((d) => d.name === sourceNames.get(copyCutPath));

          if (hasDuplicatedName) {
            Toast.warn(`${denormalizePath(pastePath).join('/') as string} already exist in this folder!`);
            return false;
          }
          return true;
        });

      if (!copyCutPayload.length) return;

      if (
        !isCopy &&
        !(await confirm({
          message: (
            <div>
              Are you sure to move
              <ul>
                {copyCutPayload.map(({ copyCutPath }) => (
                  <li key={copyCutPath}>{denormalizePath(copyCutPath).join('/')}</li>
                ))}
              </ul>
              to {pasteParentPathArr.join('/') || 'root'}?
            </div>
          ),
        }))
      ) {
        await onCancel?.();
        return;
      }

      await copyCutDoc(copyCutPayload, () => {
        if (isCopy) return;
        // Run in the same synchronous turn as the GitHub overlay dispatch. React then observes the destination path
        // and renamed tabs together, instead of briefly querying the tombstoned source document.
        renameTabs(
          copyCutPayload.map(({ copyCutPath, pastePath, isFile }) => ({
            oldPath: copyCutPath,
            newPath: pastePath,
            isFile,
          })),
        );
      });

      copyCutPayload.forEach(({ copyCutPath, isCopy: isCopyInPayload }) => {
        if (!isCopyInPayload) {
          const copyCutItem = treeData[copyCutPath];
          if (copyCutItem) {
            const copyCutParentItem = treeData[copyCutItem.data.parentIdx];
            if (copyCutParentItem) {
              deleteSubDocItem(copyCutParentItem, copyCutItem.index, treeData);
            }
          }
        }
      });
      const pasteParentItem = treeData[pasteParentPathArr.length ? normalizePath(pasteParentPathArr) : 'root'];
      if (pasteParentItem) void updateSubDocItems(pasteParentItem, treeData, provider);

      Toast('updated successfully!');
      return true;
    } catch (err) {
      Toast.error((err as Error).message);
    } finally {
      // clear the previous copy and cut
      dispatch(
        updateCopyCut({
          isCopy: false,
          copyCutPaths: [],
        }),
      );
    }
  };
};

export const useDropDoc = () => {
  const [getDocSubItems] = useLazyWorkspaceSubItemsQuery();

  const pasteDoc = usePasteDoc();

  return async ({
    items,
    target,
    treeData,
    treeProvider,
  }: {
    items: TreeItem<TreeItemData>[];
    target: DraggingPosition;
    treeData: Record<TreeItemIndex, TreeItem<TreeItemData>>;
    treeProvider: StaticTreeDataProvider<TreeItemData>;
  }) => {
    const targetItemIdx = target.targetType === 'between-items' ? target.parentItem : target.targetItem;
    const targetItem = treeData[targetItemIdx];
    if (!targetItem) {
      Toast.warn('Drop target is no longer available');
      return;
    }

    await pasteDoc({
      pasteParentPathArr: targetItem.data.path,
      providedTreeDataCtx: {
        data: treeData,
        provider: treeProvider,
      },
      providedIsCopy: false,
      providedCopyCutPaths: items.map((item) => normalizePath(item.data.path)),
      providedCopyCutItems: items,
      onCancel: async () => {
        // reorder the moved items
        await Promise.all(
          items.map(async (item) => {
            // original parent
            const parentIdx = item.data.parentIdx;
            const parentItem = treeData[parentIdx];
            if (parentItem?.children) {
              // make sure the order
              const { data: subDocItems, status } = await getDocSubItems({
                folderDocPath: parentItem.data.path.join('/'),
              });
              if (status !== QueryStatus.fulfilled) {
                Toast.error('Failed to get sub doc items');
                return;
              }
              parentItem.children = subDocItems.map((d) => normalizePath(d.path));
            }
            targetItem?.children?.splice(targetItem?.children?.indexOf(item.index), 1);
          }),
        );
      },
    });
  };
};

interface CreateNewDocProps {
  /** the new item */
  item: TreeItem<TreeItemData>;
  arrow?: ReactNode;
  style?: React.CSSProperties;
}
export const CreateNewDocItem: FC<CreateNewDocProps> = ({ item, arrow, style }) => {
  const { isFolder } = item;
  const [newFileName, setNewFileName] = useState('');

  const treeDataCtx = useContext(TreeDataCtx);

  const createDoc = useCreateWorkspaceDoc();
  const updateSubDocItems = useUpdateSubDocItems();
  const navigate = useNavigate();

  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewFileName(e.target.value);
  };
  const onBlur = async () => {
    if (!treeDataCtx) return;

    const { provider, data: treeData } = treeDataCtx;
    const parentItem = treeData[item.data.parentIdx];
    if (!parentItem) return;

    if (newFileName.trim()) {
      const norPath = normalizePath(parentItem.data.path.concat(newFileName));

      // check if there is a repeat name
      // TODO: currently not support the same name of folder and file in the same dir
      // may need to add a extra mark for doc idx keys
      if (parentItem.children?.some((idx) => normalizePath(treeData[idx].data.path) === norPath)) {
        Toast.warn('name already exist in this folder!');
        return;
      }

      try {
        await createDoc({ filePath: norPath, isFile: !isFolder });

        // direct to this new doc if it is a file
        if (!isFolder) void navigate(`/article/${norPath as string}`);

        Toast('created successfully!');
      } catch (err) {
        Toast.error((err as Error).message);
      }
    }

    await deleteDocItem(provider, treeData, [{ parentItem, idx: item.index }]);
    await updateSubDocItems(parentItem, treeData, provider);
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="item link file operation-item" style={style}>
      {isFolder ? arrow : <i className="pi pi-file"></i>}
      <InputText
        ref={inputRef}
        className="menu-item-input"
        value={newFileName}
        onChange={onChange}
        onBlur={() => void onBlur()}
      />
    </div>
  );
};

interface RenameDocProps {
  /** the rename item */
  item: TreeItem<TreeItemData>;
  arrow?: ReactNode;
  style?: React.CSSProperties;
}
export const RenameDocItem: FC<RenameDocProps> = ({ item, arrow, style }) => {
  const { isFolder } = item;
  const [newFileName, setNewFileName] = useState(item.data.name);

  const modifyName = useRenameWorkspaceDoc();
  const updateSubDocItems = useUpdateSubDocItems();
  const renameTab = useRenameTab();

  const treeDataCtx = useContext(TreeDataCtx);

  const inputRef = useRef<HTMLInputElement>(null);
  const skipOnBlur = useRef(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewFileName(e.target.value);
  };

  const onBlur = () => {
    if (!treeDataCtx) return;

    // wait for the click event to be triggered
    setTimeout(() => {
      if (skipOnBlur.current) {
        skipOnBlur.current = false;
        return;
      }

      const { provider } = treeDataCtx;
      item.data.rename = false;
      void provider.onDidChangeTreeDataEmitter.emit([item.index]);
    }, 100);
  };

  const confirmRename = async () => {
    if (newFileName.trim() === item.data.name) {
      onBlur();
      return;
    }

    skipOnBlur.current = true;

    const { path, parentIdx } = item.data;

    if (!treeDataCtx) return;
    const { data: treeData, provider } = treeDataCtx;
    const parentItem = treeData[parentIdx];
    if (!parentItem) return;

    const modifyPath = normalizePath(path);
    const newPath = normalizePath(path.slice(0, -1).concat(newFileName));

    if (parentItem.children?.some((idx) => normalizePath(treeData[idx].data.path) === newPath)) {
      Toast.warn('the name is repeated!');
      return;
    }

    try {
      await modifyName(
        {
          filePath: modifyPath,
          name: newFileName,
          isFile: !isFolder,
        },
        () => renameTab(normalizePath(path), newPath, !isFolder),
      );

      void updateSubDocItems(parentItem, treeData, provider);

      Toast('rename successfully!');
    } catch (err) {
      Toast.error((err as Error).message);
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="item link file operation-item" style={style}>
      {isFolder ? arrow : <i className="pi pi-file"></i>}
      <InputText ref={inputRef} className="menu-item-input" value={newFileName} onChange={onChange} onBlur={onBlur} />
      <i className="pi pi-check input-confirm" onClick={() => void confirmRename()}></i>
    </div>
  );
};
