/* eslint-disable @typescript-eslint/no-magic-numbers */
import { InputText } from 'primereact/inputtext';
import { FC, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { StaticTreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree';
import { useNavigate } from 'react-router-dom';

import { TreeDataCtx, TreeItemData } from './type';

import { useCreateDocMutation, useGetNorDocsQuery } from '@/redux-api/docs';
import Toast from '@/utils/Toast';
import { confirm, normalizePath } from '@/utils/utils';

export const createNewDocItem = async (
  treeProvider: StaticTreeDataProvider<TreeItemData>,
  treeData: Record<TreeItemIndex, TreeItem<TreeItemData>>,
  item: TreeItem<TreeItemData>,
  isFolder = false,
) => {
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
  await treeProvider.onDidChangeTreeDataEmitter.emit([item.index]);
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

export const deleteDoc = async (
  treeProvider: StaticTreeDataProvider<TreeItemData>,
  treeData: Record<TreeItemIndex, TreeItem<TreeItemData>>,
  item: TreeItem<TreeItemData>,
  deleteAction: (filePath: string, isFile: boolean) => Promise<void>,
) => {
  const isConfirm = await confirm({
    message: `Are you sure to delete ${item.data.name as string}?`,
    acceptLabel: 'Delete',
  });
  if (!isConfirm) return;

  try {
    const { isFolder } = item;
    const { path } = item.data;
    await deleteAction(normalizePath(path), !isFolder);

    const parentItem = treeData[item.data.parentIdx];
    if (!parentItem) return;

    await deleteDocItem(treeProvider, treeData, parentItem, item.index);
    Toast('deleted!', 'WARNING');
  } catch {
    Toast('failed to delete...', 'ERROR');
  }
};

interface CreateNewDocProps {
  /** the new item */
  item: TreeItem<TreeItemData>;
  arrow?: ReactNode;
}

export const CreateNewDoc: FC<CreateNewDocProps> = ({ item, arrow }) => {
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
