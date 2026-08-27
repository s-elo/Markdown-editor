import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { FC, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

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

export const GitHubSettings: FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const saveDoc = useSaveDoc();
  const workspace = useSelector(selectGithubWorkspace);
  const { githubLogin, isGitHubLoginLoading, startGitHubLogin } = useGitHubLogin();
  const {
    data: repositories = [],
    error: repositoriesError,
    isFetching: repositoriesLoading,
  } = useListGitHubRepositoriesQuery(undefined, { skip: !githubLogin });
  const [selectedRepository, setSelectedRepository] = useState(
    workspace.config.owner && workspace.config.repo ? `${workspace.config.owner}/${workspace.config.repo}` : '',
  );
  const repository = repositories.find((item) => item.fullName === selectedRepository);
  const { data: branches = [], isFetching: branchesLoading } = useListGitHubBranchesQuery(
    repository ? { owner: repository.owner, repo: repository.name } : { owner: '', repo: '' },
    { skip: !repository },
  );
  const [branch, setBranch] = useState(workspace.config.branch);
  const [docsRoot, setDocsRoot] = useState(workspace.config.docsRoot);
  const { data: repositorySettings } = useGetGitHubWorkspaceSettingsQuery(
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
    if (repository && !branches.includes(branch)) setBranch(repository.defaultBranch);
  }, [branch, branches, repository]);

  useEffect(() => {
    if (repositorySettings) setDocsRoot(repositorySettings.docsRoot);
  }, [repositorySettings]);

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
        <Button label="Sign in with GitHub" icon="pi pi-github" onClick={startGitHubLogin} />
      </div>
    );
  }

  const selectWorkspace = async (initialize: boolean) => {
    if (!repository || !branch) return;
    try {
      const config = {
        ...emptyConfig,
        owner: repository.owner,
        repo: repository.name,
        branch,
        docsRoot: docsRoot.replace(/^\/+|\/+$/g, ''),
      };
      if (initialize) {
        await initializeWorkspace(config).unwrap();
      }
      await saveDoc();
      dispatch(updateTabs([]));
      void navigate('/purePage');
      dispatch(setGitHubWorkspaceConfig(config));
      Toast(initialize ? 'GitHub workspace initialized' : 'GitHub workspace selected');
    } catch (error) {
      Toast.error((error as { message?: string }).message ?? 'Failed to select GitHub workspace');
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
        <span>Signed in as {githubLogin}</span>
        {repositoriesError && 'message' in repositoriesError && (
          <small className="github-access-message github-access-error">{repositoriesError.message}</small>
        )}
        <small className="github-access-message">
          Repositories appear after this GitHub App is installed on them with read and write Contents permission.
        </small>
      </div>
      <div className="setting-item">
        <label className="setting-label">Existing repository</label>
        <Dropdown
          value={selectedRepository}
          options={repositories.map((item) => ({ label: item.fullName, value: item.fullName }))}
          loading={repositoriesLoading}
          filter
          placeholder="Select a writable repository"
          onChange={(event) => {
            setSelectedRepository(event.value as string);
            const selected = repositories.find((item) => item.fullName === event.value);
            setBranch(selected?.defaultBranch ?? '');
          }}
        />
        <Dropdown
          value={branch}
          options={branches.map((item) => ({ label: item, value: item }))}
          loading={branchesLoading}
          placeholder="Select branch"
          onChange={(event) => {
            setBranch(event.value as string);
          }}
        />
        <InputText
          value={docsRoot}
          placeholder="Docs root (empty for repository root)"
          onChange={(event) => {
            setDocsRoot(event.target.value);
          }}
        />
        <div className="workspace-setting">
          <Button
            label="Use workspace"
            size="small"
            disabled={!repository || !branch}
            onClick={() => void selectWorkspace(false)}
          />
          <Button
            label="Initialize settings"
            size="small"
            outlined
            loading={initializing}
            disabled={!repository || !branch}
            onClick={() => void selectWorkspace(true)}
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
