import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { FC, useState } from 'react';
import { useSelector } from 'react-redux';

import { FolderSelectorModal } from '@/components/FolderSelector/FolderSelector';
import { useGetSettingsQuery, useUpdateSettingsMutation } from '@/redux-api/settings';
import { selectGitHubWorkspaceConfig, selectWorkspaceMode } from '@/redux-feature/githubWorkspaceSlice';
import { startGitHubInstall, startGitHubLogin, useGitHubAccessToken } from '@/utils/hooks/githubAuthHooks';
import Toast from '@/utils/Toast';

interface EmptyProps {
  hasWorkspaceError?: boolean;
  onCreateFirstDoc: () => void;
}

export const Empty: FC<EmptyProps> = ({ hasWorkspaceError = false, onCreateFirstDoc }) => {
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const workspaceMode = useSelector(selectWorkspaceMode);
  const githubWorkspaceConfig = useSelector(selectGitHubWorkspaceConfig);
  const githubAccessToken = useGitHubAccessToken();
  const { data: settings, isFetching: isSettingsFetching } = useGetSettingsQuery(undefined, {
    skip: workspaceMode === 'github',
  });
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

  const renderAction = () => {
    if (workspaceMode === 'github') {
      if (!githubAccessToken) {
        return (
          <Button className="empty-container-title" icon="pi pi-github" size="small" onClick={startGitHubLogin}>
            Sign in with GitHub
          </Button>
        );
      }

      if (hasWorkspaceError) {
        return (
          <Button className="empty-container-title" icon="pi pi-github" size="small" onClick={startGitHubInstall}>
            Configure GitHub App access
          </Button>
        );
      }

      if (!githubWorkspaceConfig.owner || !githubWorkspaceConfig.repo || !githubWorkspaceConfig.branch) {
        return <div>Choose a GitHub workspace in Settings.</div>;
      }

      return (
        <Button className="empty-container-title" icon="pi pi-file-plus" size="small" onClick={onCreateFirstDoc}>
          Create first document
        </Button>
      );
    }

    if (isSettingsFetching) {
      return <ProgressSpinner style={{ width: '50px', height: '50px' }} />;
    }

    if (!settings?.docRootPath) {
      return (
        <Button
          className="empty-container-title"
          size="small"
          onClick={() => {
            setShowFolderSelector(true);
          }}
        >
          Select Workspace
        </Button>
      );
    }

    if (hasWorkspaceError) {
      return <div>Oops, something went wrong while loading the workspace.</div>;
    }

    return (
      <Button className="empty-container-title" icon="pi pi-file-plus" size="small" onClick={onCreateFirstDoc}>
        Create first document
      </Button>
    );
  };

  return (
    <div className="empty-container">
      {renderAction()}
      <FolderSelectorModal visible={showFolderSelector} onHide={handleModalHidden} onSelectFolder={handleConfirm} />
    </div>
  );
};
