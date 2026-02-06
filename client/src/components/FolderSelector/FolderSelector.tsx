import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { FC, useEffect, useState } from 'react';

import { Cascader, CascaderListItem, CascaderItemValue } from '@/components/Cascader/Cascader';
import { useLazyGetDocSubItemsQuery } from '@/redux-api/docs';

import './FolderSelector.scss';

interface FolderSelectorProps {
  /** path string: path/to/folder */
  onSelectFolder?: (folderPath: string) => void;
}

export const FolderSelector: FC<FolderSelectorProps> = ({ onSelectFolder }) => {
  const [fetchSubItems] = useLazyGetDocSubItemsQuery();

  const [data, setData] = useState<CascaderListItem[][]>([]);
  const [selectFolderPath, setSelectFolderPath] = useState<string[]>([]);

  const getSubFolders = async (parentPath = '') => {
    const { data: subItems } = await fetchSubItems({ folderDocPath: parentPath, homeRootDir: true });
    return (
      subItems?.filter((item) => !item.isFile).map((item) => ({ label: item.name, value: { path: item.path } })) ?? []
    );
  };

  useEffect(() => {
    const fn = async () => {
      const subItems = await getSubFolders();
      setData([subItems]);
    };
    void fn();
  }, []);

  const handleSelectItem = async (value: CascaderItemValue) => {
    const { path } = value;
    setSelectFolderPath(path);
    onSelectFolder?.(path.join('/'));

    // remove home dir prefix
    const subItems = await getSubFolders(path.slice(1).join('/'));
    const level = path.length - 1;
    const newData = data.slice(0, level).concat([subItems]);
    setData(newData);
  };

  return (
    <div className="folder-selector">
      <div className="selected-folder-display">
        👆 <strong>Selectd Folder:</strong> {selectFolderPath.join('/')}
      </div>
      <Cascader
        data={data}
        onSelectItem={(value) => {
          void handleSelectItem(value);
        }}
      />
    </div>
  );
};

export interface FolderSelectorModalProps extends FolderSelectorProps {
  visible: boolean;
  onHide: () => void;
}

export const FolderSelectorModal: FC<FolderSelectorModalProps> = ({ onSelectFolder, visible, onHide }) => {
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
            }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            onClick={() => {
              onSelectFolder?.(selectFolderPath);
              onHide();
            }}
          >
            Confirm
          </Button>
        </div>
      }
      visible={visible}
      onHide={onHide}
    >
      <FolderSelector onSelectFolder={setSelectFolderPath} />
    </Dialog>
  );
};
