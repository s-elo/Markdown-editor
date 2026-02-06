import { Button } from 'primereact/button';
import { FC, useState } from 'react';

import { FolderSelectorModal } from '@/components/FolderSelector/FolderSelector';
import { useGetSettingsQuery, useUpdateSettingsMutation } from '@/redux-api/settings';
import Toast from '@/utils/Toast';

export const Empty: FC = () => {
  const [showFolderSelector, setShowFolderSelector] = useState(false);

  const { data: { data: settings } = { data: null } } = useGetSettingsQuery();
  const [updateSettings] = useUpdateSettingsMutation();

  const handleModalHidden = () => {
    setShowFolderSelector(false);
  };

  const handleConfirm = async (selectedFolderPath: string) => {
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
      <FolderSelectorModal visible={showFolderSelector} onHide={handleModalHidden} onSelectFolder={handleConfirm} />
    </div>
  );
};
