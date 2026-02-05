import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { FC, useState } from 'react';

import { FolderSelector } from '../FolderSelector/FolderSelector';

import { useGetSettingsQuery, useUpdateSettingsMutation } from '@/redux-api/settings';
import Toast from '@/utils/Toast';

export const Empty: FC = () => {
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>('');

  const { data: { data: settings } = { data: null } } = useGetSettingsQuery();
  const [updateSettings] = useUpdateSettingsMutation();

  const handleModalHidden = () => {
    setShowFolderSelector(false);
    setSelectedFolderPath('');
  };

  const handleConfirm = async () => {
    console.log(selectedFolderPath);
    if (!selectedFolderPath) return;

    try {
      const resp = await updateSettings({ docRootPath: selectedFolderPath }).unwrap();
      if (resp.code === 1) {
        Toast(resp.message, 'ERROR');
      } else {
        Toast('Settings updated successfully', 'SUCCESS');
      }
    } catch (e) {
      Toast(String(e), 'ERROR');
    } finally {
      setShowFolderSelector(false);
    }
  };

  return (
    <div className="empty-container">
      {settings?.docRootPath && (
        <>
          Doc in current path is empty.
          <p>Current path: {settings?.docRootPath}</p>
        </>
      )}
      <Button
        className="empty-container-title"
        size="small"
        onClick={() => {
          setShowFolderSelector(true);
        }}
      >
        Select Workspace
      </Button>
      <Dialog
        header={<div className="modal-title">⚙️ Select Workspace</div>}
        footer={
          <div className="modal-footer">
            <Button
              size="small"
              onClick={() => {
                setShowFolderSelector(false);
              }}
            >
              Cancel
            </Button>
            <Button size="small" onClick={() => void handleConfirm()}>
              Confirm
            </Button>
          </div>
        }
        visible={showFolderSelector}
        onHide={handleModalHidden}
      >
        <FolderSelector onSelectFolder={setSelectedFolderPath} />
      </Dialog>
    </div>
  );
};
