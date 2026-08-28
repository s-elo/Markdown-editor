import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Chips } from 'primereact/chips';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { FC, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/Icon/Icon';
import { WORKSPACE_SETTINGS_PATH } from '@/constants';
import {
  useCreateGitHubRepositoryMutation,
  useGetGitHubWorkspaceSettingsQuery,
  useInitializeGitHubWorkspaceMutation,
  useListGitHubBranchesQuery,
  useListGitHubRepositoriesQuery,
} from '@/redux-api/github';
import { updateTabs } from '@/redux-feature/curDocSlice';
import { emptyConfig, selectGithubWorkspace, setGitHubWorkspaceConfig } from '@/redux-feature/githubWorkspaceSlice';
import { useGitHubLogin } from '@/utils/hooks/githubAuthHooks';
import { useSaveDoc } from '@/utils/hooks/reduxHooks';
import Toast from '@/utils/Toast';
import { confirm } from '@/utils/utils';

export const GitHubSettings: FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const saveDoc = useSaveDoc();
  const workspace = useSelector(selectGithubWorkspace);
  const { githubLogin, githubAvatarUrl, isGitHubLoginLoading, startGitHubInstall, startGitHubLogin } = useGitHubLogin();
  const {
    data: repositories = [],
    error: repositoriesError,
    isFetching: repositoriesLoading,
  } = useListGitHubRepositoriesQuery(undefined, { skip: !githubLogin });
  const savedRepository =
    workspace.config.owner && workspace.config.repo ? `${workspace.config.owner}/${workspace.config.repo}` : '';
  const [selectedRepository, setSelectedRepository] = useState(savedRepository);
  const repository = repositories.find((item) => item.fullName === selectedRepository);
  const { data: branches = [], isFetching: branchesLoading } = useListGitHubBranchesQuery(
    repository ? { owner: repository.owner, repo: repository.name } : { owner: '', repo: '' },
    { skip: !repository },
  );
  const [branch, setBranch] = useState(workspace.config.branch);
  const [docsRoot, setDocsRoot] = useState(workspace.config.docsRoot);
  const [ignoreDirs, setIgnoreDirs] = useState(workspace.config.ignoreDirs);
  const {
    currentData: repositorySettings,
    error: repositorySettingsError,
    isFetching: repositorySettingsLoading,
    isSuccess: repositorySettingsLoaded,
    refetch: refetchRepositorySettings,
  } = useGetGitHubWorkspaceSettingsQuery(
    repository && branch
      ? { owner: repository.owner, repo: repository.name, branch }
      : { owner: '', repo: '', branch: '' },
    { skip: !repository || !branch },
  );
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [createRepository, { isLoading: creating }] = useCreateGitHubRepositoryMutation();
  const [initializeWorkspace, { isLoading: initializing }] = useInitializeGitHubWorkspaceMutation();

  useEffect(() => {
    setSelectedRepository(savedRepository);
    setBranch(workspace.config.branch);
    setDocsRoot(workspace.config.docsRoot);
    setIgnoreDirs(workspace.config.ignoreDirs);
  }, [savedRepository, workspace.config.branch, workspace.config.docsRoot, workspace.config.ignoreDirs]);

  useEffect(() => {
    if (selectedRepository === savedRepository && repository && !branchesLoading && !branches.includes(branch)) {
      setBranch(repository.defaultBranch);
    }
  }, [branch, branches, branchesLoading, repository, savedRepository, selectedRepository]);

  useEffect(() => {
    if (repositorySettings) {
      setDocsRoot(repositorySettings.docsRoot);
      setIgnoreDirs(repositorySettings.ignoreDirs);
    }
  }, [repositorySettings]);

  const repositoryOptions = repositories.map((item) => ({ label: item.fullName, value: item.fullName }));
  if (selectedRepository && !repositoryOptions.some((option) => option.value === selectedRepository)) {
    repositoryOptions.unshift({ label: selectedRepository, value: selectedRepository });
  }
  const repositoryItemTemplate = (option: { label: string; value: string }) => {
    const repositoryUrl = `https://github.com/${option.value}`;

    return (
      <div className="github-repository-option">
        <span>{option.label}</span>
        <Icon
          id={`github-repository-${option.value.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
          className="github-repository-open-icon"
          iconName="external-link"
          size="12px"
          toolTipContent={`Open ${option.label} on GitHub`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            window.open(repositoryUrl, '_blank', 'noopener,noreferrer');
          }}
        />
      </div>
    );
  };
  const branchOptions = branches.map((item) => ({ label: item, value: item }));
  if (branch && !branchOptions.some((option) => option.value === branch)) {
    branchOptions.unshift({ label: branch, value: branch });
  }
  const normalizedDocsRoot = docsRoot.replace(/^\/+|\/+$/g, '');
  const workspaceSettingsChanged = Boolean(
    repositorySettings &&
      (repositorySettings.docsRoot !== normalizedDocsRoot ||
        repositorySettings.ignoreDirs.length !== ignoreDirs.length ||
        repositorySettings.ignoreDirs.some((directory, index) => directory !== ignoreDirs[index])),
  );

  const getSelectedConfig = () => ({
    ...emptyConfig,
    owner: repository?.owner ?? '',
    repo: repository?.name ?? '',
    branch,
    docsRoot: normalizedDocsRoot,
    ignoreDirs,
  });

  if (isGitHubLoginLoading) {
    return (
      <div className="setting-item">
        <label className="setting-label">GitHub account</label>
        <span>
          <i className="pi pi-spin pi-spinner" /> Loading GitHub account…
        </span>
      </div>
    );
  }

  if (!githubLogin) {
    return (
      <div className="setting-item">
        <label className="setting-label">GitHub account</label>
        <div>
          <Button label="Sign in with GitHub" icon="pi pi-github" onClick={startGitHubLogin} />
          <Button
            label="Install GitHub App"
            icon="pi pi-external-link"
            severity="secondary"
            text
            onClick={startGitHubInstall}
          />
        </div>
      </div>
    );
  }

  const selectWorkspace = async () => {
    if (!repository || !branch || !repositorySettingsLoaded) return;
    try {
      const config = getSelectedConfig();
      if (!repositorySettings) {
        await initializeWorkspace(config).unwrap();
      }
      await saveDoc();
      dispatch(updateTabs([]));
      void navigate('/purePage');
      dispatch(setGitHubWorkspaceConfig(config));
      Toast('GitHub workspace ready');
    } catch (error) {
      Toast.error((error as { message?: string }).message ?? 'Failed to select GitHub workspace');
    }
  };

  const updateWorkspaceSettings = async () => {
    if (!repository || !branch || !repositorySettings || !workspaceSettingsChanged) return;
    const confirmed = await confirm({
      header: 'Update GitHub workspace settings?',
      message: `This will create a commit that updates ${WORKSPACE_SETTINGS_PATH} in the selected branch.`,
      acceptLabel: 'Update settings',
    });
    if (!confirmed) return;
    try {
      await initializeWorkspace(getSelectedConfig()).unwrap();
      await refetchRepositorySettings();
      Toast('GitHub workspace settings updated');
    } catch (error) {
      Toast.error((error as { message?: string }).message ?? 'Failed to update GitHub workspace settings');
    }
  };

  const createNewRepository = async () => {
    if (!newRepoName.trim()) return;
    try {
      const result = await createRepository({
        name: newRepoName.trim(),
        description: newRepoDescription.trim() || undefined,
        private: newRepoPrivate,
        docsRoot: 'docs',
      }).unwrap();
      await saveDoc();
      dispatch(updateTabs([]));
      void navigate('/purePage');
      dispatch(setGitHubWorkspaceConfig(result.config));
      setSelectedRepository(`${result.config.owner}/${result.config.repo}`);
      Toast('GitHub repository created');
    } catch (error) {
      Toast.error((error as { message?: string }).message ?? 'Failed to create GitHub repository');
    }
  };

  return (
    <>
      <div className="setting-item github-account-setting">
        <label className="setting-label">GitHub account</label>
        <div className="github-account-details">
          {githubAvatarUrl && (
            <img className="github-settings-avatar" src={githubAvatarUrl} alt={`${githubLogin}'s GitHub avatar`} />
          )}
          <span>Signed in as {githubLogin}</span>
        </div>
        {repositoriesError && 'message' in repositoriesError && (
          <small className="github-access-message github-access-error">{repositoriesError.message}</small>
        )}
        <small className="github-access-message">
          Repositories appear after this GitHub App is installed on them with read and write Contents permission.
        </small>
        <Button label="Configure repository access" icon="pi pi-external-link" outlined onClick={startGitHubInstall} />
      </div>
      <div className="setting-item">
        <label className="setting-label">Existing repository</label>
        <Dropdown
          value={selectedRepository}
          options={repositoryOptions}
          itemTemplate={repositoryItemTemplate}
          loading={repositoriesLoading}
          filter
          placeholder="Select a writable repository"
          onChange={(event) => {
            setSelectedRepository(event.value as string);
            const selected = repositories.find((item) => item.fullName === event.value);
            setBranch(selected?.defaultBranch ?? '');
            setDocsRoot(emptyConfig.docsRoot);
            setIgnoreDirs([...emptyConfig.ignoreDirs]);
          }}
        />
        <Dropdown
          value={branch}
          options={branchOptions}
          loading={branchesLoading}
          placeholder="Select branch"
          onChange={(event) => {
            setBranch(event.value as string);
            setDocsRoot(emptyConfig.docsRoot);
            setIgnoreDirs([...emptyConfig.ignoreDirs]);
          }}
        />
        <InputText
          value={docsRoot}
          placeholder="Docs root (empty for repository root)"
          onChange={(event) => {
            setDocsRoot(event.target.value);
          }}
        />
        <label className="setting-label">Ignore Directories</label>
        <Chips
          value={ignoreDirs}
          onChange={(event) => {
            setIgnoreDirs(event.value ?? []);
          }}
        />
        {repositorySettingsLoading && <small className="github-access-message">Checking workspace settings…</small>}
        {repositorySettingsLoaded && repositorySettings === null && (
          <small className="github-access-message">
            Workspace settings will be created automatically when you use this workspace.
          </small>
        )}
        {repositorySettingsError && 'message' in repositorySettingsError && (
          <small className="github-access-message github-access-error">{repositorySettingsError.message}</small>
        )}
        {workspaceSettingsChanged && (
          <small className="github-access-message">
            Confirm the workspace settings update before using this workspace.
          </small>
        )}
        <div className="workspace-setting">
          {repositorySettings && (
            <Button
              label="Update workspace settings"
              size="small"
              outlined
              loading={initializing}
              disabled={!workspaceSettingsChanged || repositorySettingsLoading}
              onClick={() => void updateWorkspaceSettings()}
            />
          )}
          <Button
            label="Use workspace"
            size="small"
            loading={initializing && repositorySettings === null}
            disabled={
              !repository ||
              !branch ||
              initializing ||
              repositorySettingsLoading ||
              !repositorySettingsLoaded ||
              workspaceSettingsChanged
            }
            onClick={() => void selectWorkspace()}
          />
        </div>
      </div>
      <div className="setting-item">
        <label className="setting-label">Create docs repository</label>
        <InputText
          value={newRepoName}
          placeholder="Repository name"
          onChange={(event) => {
            setNewRepoName(event.target.value);
          }}
        />
        <InputText
          value={newRepoDescription}
          placeholder="Description (optional)"
          onChange={(event) => {
            setNewRepoDescription(event.target.value);
          }}
        />
        <label>
          <Checkbox
            checked={newRepoPrivate}
            onChange={(event) => {
              setNewRepoPrivate(Boolean(event.checked));
            }}
          />{' '}
          Private
        </label>
        <Button
          label="Create repository"
          size="small"
          loading={creating}
          disabled={!newRepoName.trim()}
          onClick={() => void createNewRepository()}
        />
      </div>
    </>
  );
};
