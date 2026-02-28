import { BreadCrumb } from 'primereact/breadcrumb';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { ListBox } from 'primereact/listbox';
import { MenuItem } from 'primereact/menuitem';
import { FC, useEffect, useMemo, useState } from 'react';

import { NewFolder } from './NewFolder';

import { useLazyGetDocSubItemsQuery } from '@/redux-api/docs';

import './FolderSelector.scss';

interface FolderSelectorProps {
  /** path string: path/to/folder */
  onSelectFolder?: (folderPath: string) => void;
  initialPath?: string;
}

interface FolderItem {
  path: string[];
}

const getMenuItemsFromPath = (path: string[]) => {
  const homeDirPrefix = path[0];
  const slicePath = path.slice(1);
  return slicePath.map((p, i) => {
    return {
      label: p,
      data: { path: [homeDirPrefix, ...slicePath.slice(0, i + 1)] },
    };
  });
};

/**
 * - Mac: "/f1/f2" <-> ["/", "f1", "f2"]
 * - Windows: "D:/f1/f2" <-> ["", "D:", "f1", "f2"]
 * */
function normalizeFolderPath<P extends string[] | string, R = P extends string[] ? string : string[]>(path: P): R {
  if (Array.isArray(path)) {
    const trimmedPath = path.filter((p) => p); // remove empty string for windows root dir
    // Macos home_dir will be '/'
    return trimmedPath.join('/').replaceAll('//', '/') as R;
  }

  let trimmedPath: string = path;
  if (path.endsWith('/')) {
    trimmedPath = path.slice(0, -1);
  }

  // Macos
  if (trimmedPath.startsWith('/')) {
    return ['/', ...trimmedPath.split('/').slice(1)] as R;
  }

  // windows
  return ['', ...trimmedPath.split('/').slice(1)] as R;
}

export const FolderSelector: FC<FolderSelectorProps> = ({ onSelectFolder, initialPath = '' }) => {
  const [fetchSubItems] = useLazyGetDocSubItemsQuery();

  const [breadcrumbItems, setBreadcrumbItems] = useState<MenuItem[]>([]);
  const [currentFolders, setCurrentFolders] = useState<MenuItem[]>([]);
  const [currentSelectedFolder, setCurrentSelectedFolder] = useState<MenuItem | null>(null);

  const selectedFolderPath = useMemo(() => {
    const lastItemPath = (breadcrumbItems.at(-1)?.data.path ?? []) as string[];
    if (!lastItemPath.length) return '/';
    return normalizeFolderPath(lastItemPath);
  }, [breadcrumbItems]);

  const getSubFolders = async (parentPath = '') => {
    const { data: subItems } = await fetchSubItems({ folderDocPath: parentPath, homeRootDir: true });
    return (
      subItems?.filter((item) => !item.isFile).map((item) => ({ label: item.name, data: { path: item.path } })) ?? []
    );
  };

  const transformToBreadItem = (menuItem: MenuItem) => {
    const { data, label } = menuItem;

    const handleSelect = async () => {
      const lastMenuPath = data.path.slice(0, -1);
      const lastMenuLabel = lastMenuPath.slice(-1)[0];

      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      await expandFolderItem({ label: lastMenuLabel, data: { path: lastMenuPath } }, false);

      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      handleSelectFolderItem(menuItem);
    };

    return {
      label,
      data,
      template: () => (
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        <div
          className="breadcrumb-item"
          onClick={() => {
            void handleSelect();
          }}
        >
          <div className="item-label">{label}</div>
        </div>
      ),
    };
  };

  /** when clicking one folder item to select */
  function handleSelectFolderItem(menuItem: MenuItem | null) {
    if (!menuItem) return;

    const { data } = menuItem;
    const { path } = data as FolderItem;

    setCurrentSelectedFolder(menuItem);

    const newBreadcrumbItems = getMenuItemsFromPath(path).map(transformToBreadItem);
    setBreadcrumbItems(newBreadcrumbItems);

    onSelectFolder?.(normalizeFolderPath(path));
  }

  // when double click one folder item or click at the breadcrumb item
  // get the sub folder items(expand)
  async function expandFolderItem(item: MenuItem, setBreadcrumb = true) {
    const { data } = item;
    const { path } = data as FolderItem;

    // remove home dir prefix
    const subItems = await getSubFolders(path.slice(1).join('/'));
    setCurrentFolders(subItems);

    setCurrentSelectedFolder(null);

    if (setBreadcrumb) {
      const newBreadcrumbItems = getMenuItemsFromPath(path).map(transformToBreadItem);
      setBreadcrumbItems(newBreadcrumbItems);
    }
  }

  useEffect(() => {
    const fn = async () => {
      const path = normalizeFolderPath(initialPath);
      const parentPath = path.slice(0, -1);
      const subItems = await getSubFolders(parentPath.join('/'));
      setCurrentFolders(subItems);

      handleSelectFolderItem({ label: path.at(-1) ?? '', data: { path } });
    };
    void fn();
  }, [initialPath]);

  const folderItemTemplate = (item: MenuItem) => {
    return (
      <div
        className="folder-item"
        onClick={() => {
          handleSelectFolderItem(item);
        }}
      >
        <div className="item-label">{item.label}</div>
        <i
          className="pi pi-angle-right folder-item-arrow"
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            void expandFolderItem(item);
          }}
        ></i>
      </div>
    );
  };

  const handleNewFolderCreated = async (folderPath: string) => {
    const folderPathParts = normalizeFolderPath(folderPath);
    const parentPathParts = folderPathParts.slice(0, -1);
    const parentItem: MenuItem = {
      label: parentPathParts.at(-1) ?? '',
      data: { path: parentPathParts },
    };
    await expandFolderItem(parentItem, false);
    handleSelectFolderItem({
      label: folderPathParts.at(-1) ?? '',
      data: { path: folderPathParts },
    });
  };

  return (
    <div className="folder-selector">
      <div className="selected-folder-display">
        <strong>👇 Selected Folder:</strong>
        <NewFolder underFolder={selectedFolderPath} onCreated={handleNewFolderCreated} />
      </div>
      <BreadCrumb
        model={breadcrumbItems}
        home={{
          template: () => (
            <div
              className="breadcrumb-item"
              onClick={() => {
                void expandFolderItem({ label: '/', data: { path: ['/'] } });
              }}
            >
              <i className="pi pi-home" />
            </div>
          ),
        }}
      />
      <div className="current-folders-display">
        {currentFolders.length ? (
          <ListBox value={currentSelectedFolder} options={currentFolders} itemTemplate={folderItemTemplate} />
        ) : (
          <div className="current-folders-display-empty">
            <i className="pi pi-folder-open" />
            <span>Empty</span>
          </div>
        )}
      </div>
    </div>
  );
};

export interface FolderSelectorModalProps extends FolderSelectorProps {
  visible: boolean;
  onHide: () => void;
}

export const FolderSelectorModal: FC<FolderSelectorModalProps> = (props) => {
  const { onSelectFolder, visible, onHide } = props;
  const [selectFolderPath, setSelectFolderPath] = useState<string>('');

  return (
    <Dialog
      header={<div className="modal-title">⚙️ Select Workspace</div>}
      footer={
        <div className="modal-footer">
          <Button
            size="small"
            onClick={() => {
              onHide();
              setSelectFolderPath('');
            }}
            outlined
          >
            Cancel
          </Button>
          <Button
            size="small"
            disabled={!selectFolderPath}
            onClick={() => {
              onSelectFolder?.(selectFolderPath);
              onHide();
              setSelectFolderPath('');
            }}
          >
            Confirm
          </Button>
        </div>
      }
      visible={visible}
      onHide={onHide}
    >
      <FolderSelector onSelectFolder={setSelectFolderPath} initialPath={props.initialPath} />
    </Dialog>
  );
};
