import { Button } from 'primereact/button';
import { Chips } from 'primereact/chips';
import { InputText } from 'primereact/inputtext';
import { SelectButton } from 'primereact/selectbutton';
import { FC, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { GitHubSettings } from './GitHubSettings';

import { FolderSelectorModal } from '@/components/FolderSelector/FolderSelector';
import { useGetGitStatusQuery } from '@/redux-api/git';
import { Settings } from '@/redux-api/settings';
import { selectCurDocDirty, updateTabs } from '@/redux-feature/curDocSlice';
import { selectGithubWorkspace, setWorkspaceMode, type WorkspaceMode } from '@/redux-feature/githubWorkspaceSlice';
import { useSaveDoc } from '@/utils/hooks/reduxHooks';
import { confirm } from '@/utils/utils';

import './Settings.scss';

export interface SettingsBoxProps {
  settings: Settings;
  onUpdateSettings?: (settings: Settings) => void;
}

const workspaceModeOptions = [
  { label: 'Local', value: 'local' },
  { label: 'GitHub', value: 'github' },
];

export const SettingsBox: FC<SettingsBoxProps> = ({ settings, onUpdateSettings }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const saveDoc = useSaveDoc();
  const isDirty = useSelector(selectCurDocDirty);
  const workspaceMode = useSelector(selectGithubWorkspace).mode;
  const [workspace, setWorkspace] = useState<string>('');
  const [ignoreDirs, setIgnoreDirs] = useState<string[]>([]);
  const [showFolderSelector, setShowFolderSelector] = useState(false);

  const { data: { noGit: noGitSetup, remotes } = { noGit: true, remotes: [] }, isLoading: isLoadingGitStatus } =
    useGetGitStatusQuery(undefined, { skip: workspaceMode === 'github' });

  let gitInfoContent: React.ReactNode | null = null;
  if (isLoadingGitStatus) {
    gitInfoContent = <i className="pi pi-spinner pi-spin" />;
  } else if (noGitSetup) {
    gitInfoContent = (
      <div className="no-git-service">
        <i className="pi pi-exclamation-circle" />
        No git service found
      </div>
    );
  } else if (!remotes.length) {
    gitInfoContent = (
      <div className="no-git-service">
        <i className="pi pi-exclamation-circle warn" />
        Git remote not set
      </div>
    );
  } else {
    gitInfoContent = (
      <div className="git-service-status-active">
        <i className="pi pi-check-circle" />
        <span
          className="git-service-status-active-text"
          onClick={() => {
            window.open(remotes[0].webUrl, '_blank');
          }}
        >
          Git service
        </span>
      </div>
    );
  }

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

  const switchWorkspaceMode = async (mode: WorkspaceMode) => {
    if (mode === workspaceMode) return;
    if (isDirty) {
      const shouldSave = await confirm({ message: 'Save the current document before switching workspace modes?' });
      if (!shouldSave) return;
      await saveDoc();
    }
    dispatch(updateTabs([]));
    void navigate('/purePage');
    dispatch(setWorkspaceMode(mode));
  };

  return (
    <div className="settings-container">
      <div className="setting-item">
        <label className="setting-label">Workspace mode</label>
        <SelectButton
          value={workspaceMode}
          options={workspaceModeOptions}
          onChange={(event) => void switchWorkspaceMode(event.value as WorkspaceMode)}
        />
      </div>
      {workspaceMode === 'github' ? (
        <GitHubSettings />
      ) : (
        <>
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
              initialPath={workspace}
            />
            <section className="git-service-status">{gitInfoContent}</section>
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
        </>
      )}
    </div>
  );
};
