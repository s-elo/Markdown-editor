/* eslint-disable @typescript-eslint/no-magic-numbers */
import { InputText } from 'primereact/inputtext';
import { FC, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { DraggingPosition, StaticTreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { TreeDataCtx, TreeItemData, TreeRefCtx } from './type';

import {
  useCreateDocMutation,
  useDeleteDocMutation,
  useGetNorDocsQuery,
  useModifyDocNameMutation,
  useCopyCutDocMutation,
} from '@/redux-api/docs';
import { GetDocsType, NormalizedDoc } from '@/redux-api/docsApiType';
import { selectCurDocDirty, updateCurDoc } from '@/redux-feature/curDocSlice';
import { selectOperationMenu, selectSelectedItemIds, updateCopyCut } from '@/redux-feature/operationMenuSlice';
import { useCurPath } from '@/utils/hooks/docHooks';
import { useDeleteTab, useRenameTab } from '@/utils/hooks/reduxHooks';
import Toast from '@/utils/Toast';
import { confirm, denormalizePath, isPathsRelated, normalizePath } from '@/utils/utils';

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

    treeRefCtx?.expandItem(item.index);

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

  return (deleteInfo: { filePath: string; isFile: boolean }[]) => {
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
            contentPath: '',
            scrollTop: 0,
          }),
        );
      }
    }

    deleteTab(deleteInfo.map((d) => d.filePath));
  };
};

export const useDeleteDoc = () => {
  const [deleteDocMutation] = useDeleteDocMutation();
  const treeDataCtx = useContext(TreeDataCtx);

  const selectedItemIds = useSelector(selectSelectedItemIds);

  const deleteEffect = useDeleteEffect();

  // TODO: multiple deletes
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

      await deleteDocMutation(deletePayload).unwrap();
      deleteEffect(deletePayload);

      await Promise.all(
        deletedItems.map(async (i) => {
          const parentItem = treeData[i.data.parentIdx];
          if (!parentItem) return;

          await deleteDocItem(provider, treeData, [{ parentItem, idx: i.index }]);
        }),
      );
      Toast('deleted!', 'WARNING');
    } catch {
      Toast('failed to delete...', 'ERROR');
    }
  };
};

export const useRenameDoc = () => {
  const treeDataCtx = useContext(TreeDataCtx);

  return async (item: TreeItem<TreeItemData>) => {
    item.data.rename = true;
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
  const dispatch = useDispatch();
  const { isCopy: globalIsCopy, copyCutPaths } = useSelector(selectOperationMenu);
  const { data: norDocs = {} } = useGetNorDocsQuery();

  const [copyCutDoc] = useCopyCutDocMutation();

  const { navigate, curPath } = useCurPath();

  return async (
    /** the path of the clicked item */
    pasteParentPathArr: string[],
    providedIsCopy?: boolean,
    /** normalized */
    providedCopyCutPaths?: string[],
  ) => {
    const isCopy = providedIsCopy ?? globalIsCopy;

    const copyCutPayload = (providedCopyCutPaths ?? copyCutPaths)
      .map((copyCutPath) => {
        // file or dir
        const copyCutDocName = norDocs[copyCutPath].doc.name;

        const pasteParentPath = normalizePath(pasteParentPathArr);
        const pasteDoc = norDocs[pasteParentPath]?.doc;
        // click on file or not
        const pastePath = pasteDoc
          ? normalizePath(pasteParentPathArr.concat(copyCutDocName))
          : // paster to root
            copyCutDocName;

        return {
          copyCutPath,
          pastePath,
          isCopy,
          isFile: norDocs[copyCutPath].doc.isFile,
        };
      })
      .filter(({ pastePath }) => {
        // check if there is a repeat name
        if (norDocs[pastePath]) {
          Toast(`${pastePath as string} already exist in this folder!`, 'WARNING', 3000);
          return false;
        }
        return true;
      });

    if (
      !isCopy &&
      !(await confirm({
        message: `Are you sure to move ${
          copyCutPayload
            .reduce<string[]>((ret, { copyCutPath }) => {
              ret.push(denormalizePath(copyCutPath).join('/'));
              return ret;
            }, [])
            .join(', ') as string
        } to ${pasteParentPathArr.join('/')}?`,
      }))
    ) {
      return;
    }

    try {
      await copyCutDoc(copyCutPayload).unwrap();

      // if it is cut and current path is included in it, redirect
      const curDocPayload = copyCutPayload.find(({ copyCutPath, isFile }) =>
        isPathsRelated(curPath, denormalizePath(copyCutPath), isFile),
      );
      if (!isCopy && curDocPayload) {
        // if it is a file, direct to the paste path
        if (curDocPayload.isFile) {
          void navigate(`/article/${curDocPayload.pastePath as string}`);
        } else {
          const curFile = curPath.slice(
            curPath.length - (curPath.length - denormalizePath(curDocPayload.copyCutPath).length),
          );
          void navigate(`/article/${normalizePath([curDocPayload.pastePath, ...curFile]) as string}`);
        }
      }

      Toast('updated!', 'SUCCESS');
      return true;
    } catch {
      Toast('failed to copyCut...', 'ERROR');
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
  const pasteDoc = usePasteDoc();

  return async ({
    items,
    target,
    renderData,
    treeDocs,
    docs,
  }: {
    items: TreeItem<TreeItemData>[];
    target: DraggingPosition;
    renderData: Record<TreeItemIndex, TreeItem<TreeItemData>>;
    treeDocs: GetDocsType;
    docs: NormalizedDoc;
  }) => {
    const targetItem = target.targetType === 'between-items' ? target.parentItem : target.targetItem;

    const isConfirm = await confirm({
      message: 'Are you sure to move the items?',
    });
    if (!isConfirm) {
      // reorder the moved items
      items.forEach((item) => {
        const parentIdx = item.data.parentIdx;
        if (renderData[parentIdx]?.children) {
          // make sure the order
          renderData[parentIdx].children =
            parentIdx === 'root'
              ? treeDocs.map((d) => normalizePath(d.path))
              : docs[parentIdx].doc.children.map((d) => normalizePath(d.path));
        }
        renderData[targetItem]?.children?.splice(renderData[targetItem]?.children?.indexOf(item.index), 1);
      });
      return;
    }

    await pasteDoc(
      renderData[targetItem].data.path,
      false,
      items.map((item) => normalizePath(item.data.path)),
    );
  };
};

interface CreateNewDocProps {
  /** the new item */
  item: TreeItem<TreeItemData>;
  arrow?: ReactNode;
}
export const CreateNewDocItem: FC<CreateNewDocProps> = ({ item, arrow }) => {
  const { isFolder } = item;
  const [newFileName, setNewFileName] = useState('');

  const treeDataCtx = useContext(TreeDataCtx);

  const { data: norDocs = {} } = useGetNorDocsQuery();
  const [createDoc] = useCreateDocMutation();
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
      // may need to add a extra mark for norDoc keys
      if (norDocs[norPath]) {
        Toast('name already exist in this folder!', 'WARNING', 3000);
        return;
      }

      try {
        await createDoc({ filePath: norPath, isFile: !isFolder }).unwrap();

        // direct to this new doc if it is a file
        if (!isFolder) void navigate(`/article/${norPath as string}`);

        Toast('created successfully!', 'SUCCESS');
      } catch {
        Toast('failed to create...', 'ERROR');
      }
    }

    await deleteDocItem(provider, treeData, [{ parentItem, idx: item.index }]);
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="item link file operation-item">
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
}
export const RenameDocItem: FC<RenameDocProps> = ({ item, arrow }) => {
  const { isFolder } = item;
  const [newFileName, setNewFileName] = useState(item.data.name);

  const [modifyName] = useModifyDocNameMutation();
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
    const { data: treeData } = treeDataCtx;
    const parentItem = treeData[parentIdx];
    if (!parentItem) return;

    const modifyPath = normalizePath(path);
    const newPath = normalizePath(path.slice(0, -1).concat(newFileName));

    if (parentItem.children?.some((idx) => normalizePath(treeData[idx].data.path) === newPath)) {
      Toast('the name is repeated!', 'WARNING');
      return;
    }

    try {
      await modifyName({
        filePath: modifyPath,
        name: newFileName,
        isFile: !isFolder,
      }).unwrap();
      renameTab(normalizePath(path), newPath, !isFolder);

      Toast('rename successfully!', 'SUCCESS');
    } catch {
      Toast('failed to rename...', 'ERROR');
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="item link file operation-item">
      {isFolder ? arrow : <i className="pi pi-file"></i>}
      <InputText ref={inputRef} className="menu-item-input" value={newFileName} onChange={onChange} onBlur={onBlur} />
      <i className="pi pi-check input-confirm" onClick={() => void confirmRename()}></i>
    </div>
  );
};
