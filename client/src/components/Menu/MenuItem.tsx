import { ContextMenu } from 'primereact/contextmenu';
import { MenuItem as PrimeMenuItem, MenuItemCommandEvent } from 'primereact/menuitem';
import { FC, ReactNode, useMemo, useRef } from 'react';
import { TreeItem, TreeItemRenderContext } from 'react-complex-tree';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import {
  CreateNewDocItem,
  RenameDocItem,
  useCopyCutDoc,
  useDeletDoc,
  useNewDocItem,
  usePasteDoc,
  useRenameDoc,
} from './operations';
import { TreeItemData } from './type';

import { selectCurDoc } from '@/redux-feature/curDocSlice';
import { selectOperationMenu } from '@/redux-feature/operationMenuSlice';
import { useSaveDoc } from '@/utils/hooks/reduxHooks';
import { normalizePath } from '@/utils/utils';
interface FileLinkProps {
  title: ReactNode;
  arrow: ReactNode;
  item: TreeItem<TreeItemData>;
  context: TreeItemRenderContext;
}

type Command = 'copy' | 'cut' | 'delete' | 'newFile' | 'newFolder' | 'paste' | 'rename';

export const MenuItem: FC<FileLinkProps> = ({ title, arrow, context, item }) => {
  const { data, isFolder } = item;
  const { path, newFile, newFolder, rename } = data;
  const { isFocused } = context;
  const docPath = useMemo(() => normalizePath(path), [path]);

  const { contentPath } = useSelector(selectCurDoc);
  const saveDoc = useSaveDoc();
  const { copyPath, cutPath } = useSelector(selectOperationMenu);

  const createNewDocItem = useNewDocItem();
  const deleteDoc = useDeletDoc();
  const renameDoc = useRenameDoc();
  const copyCutDoc = useCopyCutDoc();
  const pasteDoc = usePasteDoc();

  const cm = useRef<ContextMenu>(null);

  const onClickCommand = async (command: Command, e: MenuItemCommandEvent) => {
    console.log(command, e);

    if (command === 'newFile' || command === 'newFolder') {
      await createNewDocItem(item, command === 'newFolder');
    } else if (command === 'delete') {
      await deleteDoc(item);
    } else if (command === 'rename') {
      await renameDoc(item);
    } else if (command === 'copy' || command === 'cut') {
      copyCutDoc(normalizePath(path), command === 'copy');
    } else if (command === 'paste') {
      if (copyPath || cutPath) {
        await pasteDoc(path);
      }
    }
  };

  const items: PrimeMenuItem[] = [
    {
      label: 'New File',
      icon: 'pi pi-file',
      visible: isFolder,
      command: (e) => {
        void onClickCommand('newFile', e);
      },
    },
    {
      label: 'New Folder',
      icon: 'pi pi-folder',
      visible: isFolder,
      command: (e) => {
        void onClickCommand('newFolder', e);
      },
    },
    {
      label: 'Copy',
      icon: 'pi pi-copy',
      disabled: copyPath === normalizePath(path),
      command: (e) => {
        void onClickCommand('copy', e);
      },
    },
    {
      label: 'Cut',
      icon: 'pi pi-clipboard',
      disabled: cutPath === normalizePath(path),
      command: (e) => {
        void onClickCommand('cut', e);
      },
    },
    {
      label: 'Paste',
      icon: 'pi pi-clipboard',
      disabled:
        !isFolder || !(copyPath || cutPath) || copyPath === normalizePath(path) || cutPath === normalizePath(path),
      command: (e) => {
        void onClickCommand('paste', e);
      },
    },
    {
      label: 'Rename',
      icon: 'pi pi-file-edit',
      command: (e) => {
        void onClickCommand('rename', e);
      },
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: (e) => {
        void onClickCommand('delete', e);
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

  let itemContent = null;
  if (newFile || newFolder) {
    itemContent = <CreateNewDocItem item={item} arrow={arrow} />;
  } else if (rename) {
    itemContent = <RenameDocItem item={item} arrow={arrow} />;
  } else if (isFolder) {
    itemContent = (
      <div className="item" onContextMenu={onRightClick} {...context.interactiveElementProps}>
        {arrow}
        {title}
      </div>
    );
  } else {
    itemContent = (
      <Link
        to={`/article/${docPath as string}`}
        className={`item link file ${docPath === contentPath ? 'selected' : ''}`}
        onClick={() => void saveDoc()}
        onContextMenu={onRightClick}
      >
        <i className="pi pi-file"></i>
        {title}
      </Link>
    );
  }
  return (
    <div className={isFocused ? 'focused item-wrapper' : 'item-wrapper'}>
      <ContextMenu model={items} ref={cm} />
      {itemContent}
    </div>
  );
};
