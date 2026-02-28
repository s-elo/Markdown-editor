import { Button } from 'primereact/button';
import { FC, useState } from 'react';

import { FolderSelectorModal } from '@/components/FolderSelector/FolderSelector';
import { useUpdateSettingsMutation } from '@/redux-api/settings';
import Toast from '@/utils/Toast';

export const Empty: FC = () => {
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [updateSettings] = useUpdateSettingsMutation();

  const handleModalHidden = () => {
    setShowFolderSelector(false);
  };

  const handleConfirm = async (selectedFolderPath: string) => {
    if (!selectedFolderPath) return;

    try {
      await updateSettings({ docRootPath: selectedFolderPath }).unwrap();
      Toast('Settings updated successfully');
    } catch (e) {
      Toast.error((e as Error).message);
    } finally {
      setShowFolderSelector(false);
    }
  };

  return (
    <div className="empty-container">
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
