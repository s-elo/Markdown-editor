import { Button } from 'primereact/button';
import { Chips } from 'primereact/chips';
import { InputText } from 'primereact/inputtext';
import { FC, useEffect, useState } from 'react';

import { FolderSelectorModal } from '@/components/FolderSelector/FolderSelector';
import { Settings } from '@/redux-api/settings';

import './Settings.scss';

export interface SettingsBoxProps {
  settings: Settings;
  onUpdateSettings?: (settings: Settings) => void;
}

export const SettingsBox: FC<SettingsBoxProps> = ({ settings, onUpdateSettings }) => {
  const [workspace, setWorkspace] = useState<string>('');
  const [ignoreDirs, setIgnoreDirs] = useState<string[]>([]);
  const [showFolderSelector, setShowFolderSelector] = useState(false);

  useEffect(() => {
    setWorkspace(settings.docRootPath ?? '');
    setIgnoreDirs(settings.ignoreDirs ?? []);
  }, [settings]);

  const handleModalHidden = () => {
    setShowFolderSelector(false);
  };

  const updateSettings = (updatedSettings: Settings) => {
    onUpdateSettings?.({ ...settings, ...updatedSettings });
  };

  const handleFolderSelectorConfirm = (selectedFolderPath: string) => {
    setWorkspace(selectedFolderPath);
    updateSettings({ docRootPath: selectedFolderPath });
  };

  return (
    <div className="settings-container">
      <div className="setting-item">
        <label className="setting-label">Workspace</label>
        <section className="workspace-setting">
          <InputText
            value={workspace}
            className="p-inputtext-sm"
            onChange={(e) => {
              setWorkspace(e.target.value);
              updateSettings({ docRootPath: e.target.value });
            }}
          />
          <Button
            style={{ marginLeft: '10px' }}
            size="small"
            onClick={() => {
              setShowFolderSelector(true);
            }}
          >
            <i className="pi pi-folder" />
          </Button>
        </section>
        <FolderSelectorModal
          visible={showFolderSelector}
          onHide={handleModalHidden}
          onSelectFolder={handleFolderSelectorConfirm}
        />
      </div>
      <div className="setting-item">
        <label className="setting-label">Ignore Directories</label>
        <Chips
          value={ignoreDirs}
          onChange={(e) => {
            const newIgnoreDirs = e.value ?? [];
            setIgnoreDirs(newIgnoreDirs);
            updateSettings({ ignoreDirs: newIgnoreDirs });
          }}
        />
      </div>
    </div>
  );
};
