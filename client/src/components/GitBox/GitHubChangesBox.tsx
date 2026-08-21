import { FC, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch } from '@/store';

import { CommitMsgBox } from '@/components/GitBox/CommitMsgBox';
import { githubApi, usePublishGitHubWorkspaceMutation } from '@/redux-api/github';
import {
  applyPublishedWorkspace,
  discardAllChanges,
  discardOperations,
  markRemoteStale,
  rebaseRemoteWorkspace,
  selectGithubWorkspace,
  stageAllOperations,
  stageOperations,
  unstageOperations,
  type GitHubOverlayEntry,
} from '@/redux-feature/githubWorkspaceSlice';
import Toast from '@/utils/Toast';
import { confirm } from '@/utils/utils';

import './GitBox.scss';

interface ChangeGroup {
  id: string;
  label: string;
  entries: GitHubOverlayEntry[];
}

const groupChanges = (entries: GitHubOverlayEntry[]) => {
  const groups = new Map<string, ChangeGroup>();
  entries.forEach((entry) => {
    const group = groups.get(entry.operationId) ?? { id: entry.operationId, label: entry.label, entries: [] };
    group.entries.push(entry);
    groups.set(entry.operationId, group);
  });
  return [...groups.values()];
};

const ChangeList: FC<{
  groups: ChangeGroup[];
  actionIcon: string;
  actionTitle: string;
  onAction: (id: string) => void;
  onRevert?: (id: string) => void;
}> = ({ groups, actionIcon, actionTitle, onAction, onRevert }) =>
  groups.length ? (
    <ul className="git-changes">
      {groups.map((group) => (
        <li key={group.id} className="space-header change-item modified">
          <div className="item-title" title={group.entries.map((entry) => entry.path).join('\n')}>
            {group.label}
          </div>
          <div className="github-change-actions">
            {onRevert && (
              <button
                type="button"
                className="github-change-action"
                title="Revert"
                onClick={() => {
                  onRevert(group.id);
                }}
              >
                <i className="pi pi-undo" />
              </button>
            )}
            <button
              type="button"
              className="github-change-action"
              title={actionTitle}
              onClick={() => {
                onAction(group.id);
              }}
            >
              <i className={actionIcon} />
            </button>
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
  const dispatch = useDispatch<AppDispatch>();
  const workspace = useSelector(selectGithubWorkspace);
  const [publishing, setPublishing] = useState(false);
  const [publish] = usePublishGitHubWorkspaceMutation();
  const stagedOperationIds = useMemo(
    () => new Set(Object.values(workspace.staged).map((entry) => entry.operationId)),
    [workspace.staged],
  );
  const workingGroups = useMemo(
    () => groupChanges(Object.values(workspace.working).filter((entry) => !stagedOperationIds.has(entry.operationId))),
    [stagedOperationIds, workspace.working],
  );
  const stagedGroups = useMemo(() => groupChanges(Object.values(workspace.staged)), [workspace.staged]);

  const publishChanges = async () => {
    if (!stagedGroups.length || workspace.remoteStale) return;
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
    try {
      setPublishing(true);
      const snapshot = await publish({
        config: workspace.config,
        staged: Object.values(workspace.staged),
        title: title.trim(),
        body,
      }).unwrap();
      dispatch(applyPublishedWorkspace(snapshot));
      Toast('Published to GitHub');
    } catch (error) {
      const message = (error as { message?: string }).message ?? 'Failed to publish to GitHub';
      if (message.includes('changed on GitHub')) dispatch(markRemoteStale(true));
      Toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

  const refreshAndRebase = async () => {
    try {
      const snapshot = await dispatch(
        githubApi.endpoints.loadGitHubWorkspace.initiate(workspace.config, { forceRefetch: true }),
      ).unwrap();
      if (snapshot.baseCommitSha === workspace.config.baseCommitSha) {
        Toast('Already up to date');
        return;
      }
      const remoteEntries = Object.fromEntries(snapshot.entries.map((entry) => [entry.path, entry]));
      const allRemotePaths = new Set([...Object.keys(workspace.baseEntries), ...Object.keys(remoteEntries)]);
      const remoteChangedPaths = [...allRemotePaths].filter(
        (path) => workspace.baseEntries[path]?.sha !== remoteEntries[path]?.sha,
      );
      const pendingEntries = [...Object.values(workspace.working), ...Object.values(workspace.staged)];
      const pendingScopes = new Set(pendingEntries.flatMap((entry) => entry.scopePaths ?? [entry.path]));
      const conflicts = remoteChangedPaths.filter((remotePath) =>
        [...pendingScopes].some(
          (scope) => remotePath === scope || remotePath.startsWith(`${scope}/`) || scope.startsWith(`${remotePath}/`),
        ),
      );
      if (conflicts.length) {
        dispatch(markRemoteStale(true));
        Toast.error(`Cannot rebase because these paths changed remotely: ${conflicts.join(', ')}`);
        return;
      }
      dispatch(rebaseRemoteWorkspace(snapshot));
      Toast('Local changes rebased onto the latest branch');
    } catch (error) {
      Toast.error((error as { message?: string }).message ?? 'Failed to refresh GitHub workspace');
    }
  };

  const discardAll = async () => {
    if (!(await confirm({ message: 'Discard every local GitHub workspace change?' }))) return;
    dispatch(discardAllChanges());
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
          disabled={!workingGroups.length}
          onClick={() => dispatch(stageAllOperations())}
        >
          <i className="pi pi-plus" />
        </button>
        <button
          type="button"
          title="Discard all"
          disabled={!workingGroups.length && !stagedGroups.length}
          onClick={() => void discardAll()}
        >
          <i className="pi pi-trash" />
        </button>
        <button
          type="button"
          title={workspace.remoteStale ? 'Rebase before publishing' : 'Publish staged'}
          disabled={publishing || workspace.remoteStale || !stagedGroups.length}
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
          groups={stagedGroups}
          actionIcon="pi pi-minus"
          actionTitle="Unstage"
          onAction={(id) => dispatch(unstageOperations([id]))}
        />
      </section>
      <section className="space-box">
        <header className="space-header">
          <div>Working Space</div>
        </header>
        <ChangeList
          groups={workingGroups}
          actionIcon="pi pi-plus"
          actionTitle="Stage"
          onAction={(id) => dispatch(stageOperations([id]))}
          onRevert={(id) => dispatch(discardOperations([id]))}
        />
      </section>
    </div>
  );
};
