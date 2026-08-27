import AddIcon from '@mui/icons-material/AddOutlined';
import RemoveIcon from '@mui/icons-material/RemoveOutlined';
import UndoIcon from '@mui/icons-material/UndoOutlined';
import { FC, useState, type ElementType } from 'react';
import { useSelector } from 'react-redux';

import type { MutationResult, WorkspaceChange } from '@markdown-editor/github-workspace';

import { CommitMsgBox } from '@/components/GitBox/CommitMsgBox';
import { Icon } from '@/components/Icon/Icon';
import { githubApi, usePublishGitHubWorkspaceMutation } from '@/redux-api/github';
import { selectGitHubWorkspaceConfig } from '@/redux-feature/githubWorkspaceSlice';
import { store } from '@/store';
import { getVisibleLogicalPath } from '@/utils/githubWorkspace';
import { githubWorkspaceStore, useGitHubWorkspaceSnapshot } from '@/utils/githubWorkspaceRuntime';
import { useDeleteTab, useRenameTabs } from '@/utils/hooks/reduxHooks';
import Toast from '@/utils/Toast';
import { confirm } from '@/utils/utils';

import './GitBox.scss';

const visibleChanges = (changes: WorkspaceChange[]) => changes.filter((change) => !change.path.endsWith('/.gitkeep'));

const ChangeList: FC<{
  changes: WorkspaceChange[];
  actionIcon: ElementType;
  actionTitle: string;
  onAction: (id: string) => void;
  onRevert?: (id: string) => void;
}> = ({ changes, actionIcon, actionTitle, onAction, onRevert }) =>
  changes.length ? (
    <ul className="git-changes">
      {changes.map((change, index) => (
        <li key={change.id} className={`space-header change-item ${change.status.toLowerCase()}`}>
          <div className="item-title" title={`${change.label}\n${change.path}`}>
            {change.path}
          </div>
          <div className="op-icon-group">
            {onRevert && (
              <Icon
                icon={UndoIcon}
                id={`github-revert-${index}`}
                size="18px"
                className="op-icon"
                toolTipContent="Revert"
                onClick={() => {
                  onRevert(change.groupId);
                }}
              />
            )}
            <Icon
              icon={actionIcon}
              id={`github-${actionTitle.toLowerCase()}-${index}`}
              size="18px"
              className="op-icon"
              toolTipContent={actionTitle}
              onClick={() => {
                onAction(change.groupId);
              }}
            />
            <span className="item-status">{change.status[0]}</span>
          </div>
        </li>
      ))}
    </ul>
  ) : (
    <div className="clean-space">
      <i className="pi pi-folder-open" />
      <span>No changes</span>
    </div>
  );

export const GitHubChangesBox: FC = () => {
  const config = useSelector(selectGitHubWorkspaceConfig);
  const workspace = useGitHubWorkspaceSnapshot();
  const renameTabs = useRenameTabs();
  const deleteTabs = useDeleteTab();
  const [publishing, setPublishing] = useState(false);
  const [publish] = usePublishGitHubWorkspaceMutation();
  const workingChanges = visibleChanges(workspace.workingChanges);
  const stagedChanges = visibleChanges(workspace.stagedChanges);

  const applyPathMappings = (result: MutationResult) => {
    const operations = result.pathMappings
      .filter((mapping) => mapping.kind === 'file' && mapping.oldPath.endsWith('.md'))
      .map((mapping) => ({
        oldPath: getVisibleLogicalPath(config, mapping.oldPath),
        newPath: getVisibleLogicalPath(config, mapping.newPath),
        isFile: true,
      }));
    if (operations.length) renameTabs(operations);
  };

  const closeDiscardedUntrackedTabs = async (changes: WorkspaceChange[]) => {
    const deletedIds = new Set(
      changes.filter((change) => change.status === 'DELETED').map((change) => change.oldEntry?.id),
    );
    const paths = changes
      .filter(
        (change) =>
          (change.status === 'UNTRACKED' || change.status === 'ADDED') &&
          change.kind === 'file' &&
          change.path.endsWith('.md') &&
          !deletedIds.has(change.newEntry?.id),
      )
      .map((change) => getVisibleLogicalPath(config, change.path));
    if (paths.length) await deleteTabs(paths, { force: true });
  };

  const publishChanges = async () => {
    if (!stagedChanges.length || workspace.remoteStale) return;
    let title = '';
    let body = '';
    const accepted = await confirm({
      message: (
        <CommitMsgBox
          onCommitMsgTitleChange={(commitTitle) => (title = commitTitle)}
          onCommitMsgBodyChange={(commitBody) => (body = commitBody)}
        />
      ),
      acceptLabel: 'Publish',
    });
    if (!accepted) return;
    if (!title.trim()) {
      Toast.warn('Commit title cannot be blank');
      return;
    }
    let token = '';
    try {
      setPublishing(true);
      const plan = await githubWorkspaceStore.beginPublish();
      token = plan.token;
      const snapshot = await publish({ config, plan, title: title.trim(), body }).unwrap();
      await githubWorkspaceStore.completePublish(snapshot, token);
      Toast('Published to GitHub');
    } catch (error) {
      if (token) githubWorkspaceStore.abortPublish(token);
      const message = (error as { message?: string }).message ?? 'Failed to publish to GitHub';
      if (message.includes('changed on GitHub')) {
        try {
          const remote = await store
            .dispatch(githubApi.endpoints.loadGitHubWorkspace.initiate(config, { forceRefetch: true }))
            .unwrap();
          await githubWorkspaceStore.attachRemote(remote);
        } catch {
          // Keep the original publish error; another refresh can retry the stale check.
        }
      }
      Toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

  const refreshAndRebase = async () => {
    try {
      const remote = await store
        .dispatch(githubApi.endpoints.loadGitHubWorkspace.initiate(config, { forceRefetch: true }))
        .unwrap();
      if (remote.baseCommitSha === workspace.baseCommitSha) {
        Toast('Already up to date');
        return;
      }
      const result = await githubWorkspaceStore.rebase(remote);
      if (result.conflicts.length) {
        Toast.error(`Cannot rebase because these paths changed remotely: ${result.conflicts.join(', ')}`);
        return;
      }
      Toast('Local changes rebased onto the latest branch');
    } catch (error) {
      Toast.error((error as { message?: string }).message ?? 'Failed to refresh GitHub workspace');
    }
  };

  const discardAll = async () => {
    if (!(await confirm({ message: 'Discard every local GitHub workspace change?' }))) return;
    const discardedChanges = [...workspace.workingChanges, ...workspace.stagedChanges];
    const result = await githubWorkspaceStore.discardAll();
    applyPathMappings(result);
    await closeDiscardedUntrackedTabs(discardedChanges);
  };

  return (
    <div className="git-box github-changes-box">
      <section className="op-box">
        <button type="button" title="Refresh and rebase" onClick={() => void refreshAndRebase()}>
          <i className="pi pi-refresh" />
        </button>
        <button
          type="button"
          title="Stage all"
          disabled={!workingChanges.length || workspace.publishing}
          onClick={() => void githubWorkspaceStore.stageAll()}
        >
          <i className="pi pi-plus" />
        </button>
        <button
          type="button"
          title="Discard all"
          disabled={!workingChanges.length && !stagedChanges.length}
          onClick={() => void discardAll()}
        >
          <i className="pi pi-trash" />
        </button>
        <button
          type="button"
          title={workspace.remoteStale ? 'Rebase before publishing' : 'Publish staged'}
          disabled={publishing || workspace.remoteStale || !stagedChanges.length}
          onClick={() => void publishChanges()}
        >
          <i className={publishing ? 'pi pi-spinner pi-spin' : 'pi pi-cloud-upload'} />
        </button>
      </section>
      {workspace.remoteStale && (
        <div className="no-git-service">The remote branch changed. Refresh and rebase first.</div>
      )}
      <section className="space-box">
        <header className="space-header">
          <div>Staged</div>
        </header>
        <ChangeList
          changes={stagedChanges}
          actionIcon={RemoveIcon}
          actionTitle="Unstage"
          onAction={(id) => void githubWorkspaceStore.unstage([id])}
        />
      </section>
      <section className="space-box">
        <header className="space-header">
          <div>Working Space</div>
        </header>
        <ChangeList
          changes={workingChanges}
          actionIcon={AddIcon}
          actionTitle="Stage"
          onAction={(id) => void githubWorkspaceStore.stage([id])}
          onRevert={(id) => {
            const discardedChanges = workspace.workingChanges.filter((change) => change.groupId === id);
            void githubWorkspaceStore.restoreWorking([id]).then(async (result) => {
              applyPathMappings(result);
              await closeDiscardedUntrackedTabs(discardedChanges);
            });
          }}
        />
      </section>
    </div>
  );
};
