import { ContextMenu } from 'primereact/contextmenu';
import { MenuItem as PrimeMenuItem } from 'primereact/menuitem';
import { FC, useMemo, useRef } from 'react';
import { TreeRenderProps } from 'react-complex-tree';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

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

import { selectOperationMenu } from '@/redux-feature/operationMenuSlice';
import { useSaveDoc } from '@/utils/hooks/reduxHooks';
import { normalizePath } from '@/utils/utils';

type FileLinkProps = TreeRenderProps<TreeItemData>['renderItem'] extends
  | ((props: infer P) => React.ReactElement | null)
  | undefined
  ? P
  : never;

type Command = 'copy' | 'cut' | 'delete' | 'newFile' | 'newFolder' | 'paste' | 'rename';

export const MenuItem: FC<FileLinkProps> = ({ title, arrow, context, item, depth }) => {
  const { data, isFolder } = item;
  const { path, newFile, newFolder, rename } = data;
  const { isFocused } = context;
  const navigate = useNavigate();
  const docPath = useMemo(() => normalizePath(path), [path]);

  const saveDoc = useSaveDoc();
  const { copyCutPaths } = useSelector(selectOperationMenu);

  const createNewDocItem = useNewDocItem();
  const deleteDoc = useDeletDoc();
  const renameDoc = useRenameDoc();
  const copyCutDoc = useCopyCutDoc();
  const pasteDoc = usePasteDoc();

  const cm = useRef<ContextMenu>(null);

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const isSelected = useMemo(() => context.isSelected, [context.isSelected]);
  const isCopyCut = useMemo(() => {
    return copyCutPaths.some((copyCutPath) => copyCutPath === normalizePath(path));
  }, [copyCutPaths, path]);

  const onClickCommand = async (command: Command) => {
    if (command === 'newFile' || command === 'newFolder') {
      await createNewDocItem(item, command === 'newFolder');
    } else if (command === 'delete') {
      await deleteDoc(item);
    } else if (command === 'rename') {
      await renameDoc(item);
    } else if (command === 'copy' || command === 'cut') {
      copyCutDoc([normalizePath(path)], command === 'copy');
    } else if (command === 'paste') {
      if (copyCutPaths.length) {
        await pasteDoc(path);
      }
    }
  };

  const items: PrimeMenuItem[] = [
    {
      label: 'New File',
      icon: 'pi pi-file',
      visible: isFolder,
      command: () => {
        void onClickCommand('newFile');
      },
    },
    {
      label: 'New Folder',
      icon: 'pi pi-folder',
      visible: isFolder,
      command: () => {
        void onClickCommand('newFolder');
      },
    },
    {
      label: 'Copy',
      icon: 'pi pi-copy',
      disabled: isCopyCut,
      command: () => {
        void onClickCommand('copy');
      },
    },
    {
      label: 'Cut',
      icon: 'pi pi-clipboard',
      disabled: isCopyCut,
      command: () => {
        void onClickCommand('cut');
      },
    },
    {
      label: 'Paste',
      icon: 'pi pi-clipboard',
      disabled: !isFolder || !copyCutPaths.length,
      command: () => {
        void onClickCommand('paste');
      },
    },
    {
      label: 'Rename',
      icon: 'pi pi-file-edit',
      command: () => {
        void onClickCommand('rename');
      },
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: () => {
        void onClickCommand('delete');
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
      <div
        className={`item`}
        onContextMenu={onRightClick}
        onClick={() => {
          // ...
        }}
      >
        {arrow}
        {title}
      </div>
    );
  } else {
    const to = (e: React.MouseEvent) => {
      if (e.metaKey) return;

      void saveDoc();
      void navigate(`/article/${docPath as string}`);
    };

    itemContent = (
      <div className={`item link file`} onClick={to} onContextMenu={onRightClick}>
        <i className="pi pi-file"></i>
        {title}
      </div>
    );
  }

  const styles: React.CSSProperties = {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    paddingLeft: `${depth * 0.5}rem`,
  };

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const isOperationItem = newFile || newFolder || rename;
  // context props will make opertion item blur and removed
  const contextProps = isOperationItem
    ? {}
    : { ...context.interactiveElementProps, ...context.itemContainerWithoutChildrenProps };

  return (
    <div
      className={`item-wrapper ${isFocused ? 'focused' : ''} ${isSelected ? 'selected' : ''}`}
      {...contextProps}
      style={styles}
    >
      <ContextMenu model={items} ref={cm} />
      {itemContent}
    </div>
  );
};
