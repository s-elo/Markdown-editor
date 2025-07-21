/* eslint-disable @typescript-eslint/no-magic-numbers */
import { InputText } from 'primereact/inputtext';
import { FC, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { StaticTreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree';
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
import { selectCurDocDirty, updateCurDoc } from '@/redux-feature/curDocSlice';
import { selectOperationMenu, updateCopyCut } from '@/redux-feature/operationMenuSlice';
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
  item: TreeItem<TreeItemData>,
  idx: TreeItemIndex,
) => {
  if (!item.children?.length) return;

  item.children?.splice(item.children.indexOf(idx), 1);
  if (treeData[idx]) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete treeData[idx];
  }
  await treeProvider.onDidChangeTreeDataEmitter.emit([item.index]);
};

export const useDeleteEffect = () => {
  const { curPath } = useCurPath();

  const { copyPath, cutPath } = useSelector(selectOperationMenu);
  const isDirty = useSelector(selectCurDocDirty);

  const dispatch = useDispatch();

  const deleteTab = useDeleteTab();

  return (deletedPath: string, isFile: boolean) => {
    if (deletedPath === copyPath || deletedPath === cutPath) {
      // clear the previous copy and cut
      dispatch(
        updateCopyCut({
          copyPath: '',
          cutPath: '',
        }),
      );
    }

    // jump if the current doc is deleted or included in the deleted folder
    if (isPathsRelated(curPath, denormalizePath(deletedPath), isFile)) {
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

      deleteTab(normalizePath(curPath));
    }
  };
};

export const useDeletDoc = () => {
  const [deleteDocMutation] = useDeleteDocMutation();
  const treeDataCtx = useContext(TreeDataCtx);

  const deleteEffect = useDeleteEffect();

  return async (item: TreeItem<TreeItemData>) => {
    if (!treeDataCtx) return;
    const isConfirm = await confirm({
      message: `Are you sure to delete ${item.data.name as string}?`,
      acceptLabel: 'Delete',
    });
    if (!isConfirm) return;

    const { provider, data: treeData } = treeDataCtx;

    try {
      const { isFolder } = item;
      const { path } = item.data;
      const deletedPath = normalizePath(path);

      await deleteDocMutation({ filePath: deletedPath, isFile: !isFolder }).unwrap();
      deleteEffect(deletedPath, !isFolder);

      const parentItem = treeData[item.data.parentIdx];
      if (!parentItem) return;

      await deleteDocItem(provider, treeData, parentItem, item.index);
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

  return (path: string, isCopy: boolean) => {
    dispatch(
      updateCopyCut({
        copyPath: isCopy ? path : '',
        cutPath: !isCopy ? path : '',
      }),
    );
  };
};

export const usePasteDoc = () => {
  const dispatch = useDispatch();
  const { copyPath, cutPath } = useSelector(selectOperationMenu);
  const { data: norDocs = {} } = useGetNorDocsQuery();

  const [copyCutDoc] = useCopyCutDocMutation();

  const { navigate, curPath } = useCurPath();

  return async (
    /** the path of the clicked item */
    pasteParentPathArr: string[],
    providedCopyCutPath?: string,
    providedIsCopy?: boolean,
  ) => {
    const isCopy = providedIsCopy ?? cutPath === '';
    const copyCutPath = providedCopyCutPath ?? (isCopy ? copyPath : cutPath);
    const copyCutOnFile = norDocs[copyCutPath].doc.isFile;
    // file or dir
    const copyCutDocName = norDocs[copyCutPath].doc.name;

    const pasteParentPath = normalizePath(pasteParentPathArr);
    const pasteDoc = norDocs[pasteParentPath]?.doc;
    // click on file or not
    const pastePath = pasteDoc
      ? normalizePath(pasteParentPathArr.concat(copyCutDocName))
      : // paster to root
        copyCutDocName;

    // check if there is a repeat name
    if (norDocs[pastePath]) {
      Toast('name already exist in this folder!', 'WARNING', 3000);
      return;
    }

    try {
      await copyCutDoc({
        copyCutPath,
        pastePath,
        isCopy,
        isFile: copyCutOnFile,
      }).unwrap();

      // if it is cut and current path is included in it, redirect
      if (!isCopy && isPathsRelated(curPath, denormalizePath(copyCutPath), copyCutOnFile)) {
        // if it is a file, direct to the paste path
        if (copyCutOnFile) {
          void navigate(`/article/${pastePath as string}`);
        } else {
          const curFile = curPath.slice(curPath.length - (curPath.length - denormalizePath(copyCutPath).length));
          void navigate(`/article/${normalizePath([pastePath, ...curFile]) as string}`);
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
          copyPath: '',
          cutPath: '',
        }),
      );
    }
  };
};

export const useDropDoc = () => {
  const pasteDoc = usePasteDoc();

  return async (itemPath: string[], targetPath: string[]) => {
    return pasteDoc(targetPath, normalizePath(itemPath), false);
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

    await deleteDocItem(provider, treeData, parentItem, item.index);
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
