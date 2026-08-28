import AddIcon from '@mui/icons-material/AddOutlined';
import FileOpenIcon from '@mui/icons-material/FileOpenOutlined';
import RemoveIcon from '@mui/icons-material/RemoveOutlined';
import UndoIcon from '@mui/icons-material/UndoOutlined';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { FC, useState, type ElementType } from 'react';
import { useSelector } from 'react-redux';

import type { MutationResult, WorkspaceChange } from '@markdown-editor/github-workspace';

import { CommitMsgBox } from '@/components/GitBox/CommitMsgBox';
import { Icon } from '@/components/Icon/Icon';
import { githubApi, usePublishGitHubWorkspaceMutation } from '@/redux-api/github';
import { selectGitHubWorkspaceConfig } from '@/redux-feature/githubWorkspaceSlice';
import { store } from '@/store';
import { getVisibleGitHubWorkspaceChanges, getVisibleLogicalPath } from '@/utils/githubWorkspace';
import { githubWorkspaceStore, useGitHubWorkspaceSnapshot } from '@/utils/githubWorkspaceRuntime';
import { useCurPath } from '@/utils/hooks/docHooks';
import { useDeleteTab, useRenameTabs, useSaveDoc } from '@/utils/hooks/reduxHooks';
import Toast from '@/utils/Toast';
import { confirm, normalizePath } from '@/utils/utils';

import './GitBox.scss';

const ChangeList: FC<{
  changes: WorkspaceChange[];
  actionIcon: ElementType;
  actionTitle: string;
  onAction: (id: string) => void;
  onOpen?: (change: WorkspaceChange) => void;
  onRevert?: (id: string) => void;
}> = ({ changes, actionIcon, actionTitle, onAction, onOpen, onRevert }) =>
  changes.length ? (
    <ul className="git-changes">
      {changes.map((change, index) => (
        <li key={change.id} className={`space-header change-item ${change.status.toLowerCase()}`}>
          <div className="item-title" title={`${change.label}\n${change.path}`}>
            {change.path}
          </div>
          <div className="op-icon-group">
            {onOpen && change.status !== 'DELETED' && change.kind === 'file' && change.path.endsWith('.md') && (
              <Icon
                icon={FileOpenIcon}
                id={`github-${actionTitle.toLowerCase()}-open-${index}`}
                size="18px"
                className="op-icon"
                toolTipContent="Open file"
                onClick={() => {
                  onOpen(change);
                }}
              />
            )}
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
  const { navigate, curPath } = useCurPath();
  const saveDoc = useSaveDoc();
  const renameTabs = useRenameTabs();
  const deleteTabs = useDeleteTab();
  const [publishDialogVisible, setPublishDialogVisible] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishBody, setPublishBody] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publish] = usePublishGitHubWorkspaceMutation();
  const workingChanges = getVisibleGitHubWorkspaceChanges(workspace.workingChanges);
  const stagedChanges = getVisibleGitHubWorkspaceChanges(workspace.stagedChanges);

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

  const openFile = (repositoryPath: string) => {
    const logicalPath = getVisibleLogicalPath(config, repositoryPath);
    if (normalizePath(curPath) === logicalPath) return;
    void saveDoc();
    void navigate(`/article/${logicalPath}`);
  };

  const publishChanges = async () => {
    if (publishing || !stagedChanges.length || workspace.remoteStale) return;
    if (!publishTitle.trim()) {
      Toast.warn('Commit title cannot be blank');
      return;
    }
    let token = '';
    try {
      setPublishing(true);
      const plan = githubWorkspaceStore.beginPublish();
      token = plan.token;
      const snapshot = await publish({ config, plan, title: publishTitle.trim(), body: publishBody }).unwrap();
      await githubWorkspaceStore.completePublish(snapshot, token);
      setPublishDialogVisible(false);
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

  const discardWorkingChanges = async () => {
    if (!(await confirm({ message: 'Discard every working-space change?' }))) return;
    const discardedChanges = workspace.workingChanges;
    const groupIds = [...new Set(discardedChanges.map((change) => change.groupId))];
    const result = await githubWorkspaceStore.restoreWorking(groupIds);
    applyPathMappings(result);
    await closeDiscardedUntrackedTabs(discardedChanges);
  };

  return (
    <div className="git-box github-changes-box">
      <section className="op-box">
        <Icon
          iconName="refresh"
          id="github-refresh-rebase"
          toolTipContent="Refresh and rebase"
          onClick={() => void refreshAndRebase()}
        />
        <Icon
          iconName={publishing ? 'spinner pi-spin' : 'cloud-upload'}
          id="github-publish-staged"
          toolTipContent={workspace.remoteStale ? 'Rebase before publishing' : 'Publish staged'}
          disabled={publishDialogVisible || publishing || workspace.remoteStale || !stagedChanges.length}
          onClick={() => {
            setPublishTitle('');
            setPublishBody('');
            setPublishDialogVisible(true);
          }}
        />
      </section>
      <Dialog
        modal
        header="Publish to GitHub"
        visible={publishDialogVisible}
        closable={!publishing}
        closeOnEscape={!publishing}
        onHide={() => {
          if (!publishing) setPublishDialogVisible(false);
        }}
        footer={
          <div className="modal-footer">
            <Button
              label="Cancel"
              size="small"
              outlined
              disabled={publishing}
              onClick={() => {
                setPublishDialogVisible(false);
              }}
            />
            <Button
              label="Publish"
              size="small"
              loading={publishing}
              disabled={publishing || workspace.remoteStale || !stagedChanges.length || !publishTitle.trim()}
              onClick={() => void publishChanges()}
            />
          </div>
        }
      >
        {publishDialogVisible && (
          <CommitMsgBox
            disabled={publishing}
            onCommitMsgTitleChange={setPublishTitle}
            onCommitMsgBodyChange={setPublishBody}
          />
        )}
      </Dialog>
      {workspace.remoteStale && (
        <div className="no-git-service">The remote branch changed. Refresh and rebase first.</div>
      )}
      <section className="space-box">
        <header className="space-header">
          <div>Staged</div>
          <div className="op-icon-group">
            <Icon
              icon={RemoveIcon}
              id="github-unstage-all"
              size="18px"
              className="op-icon"
              toolTipContent="Unstage all"
              disabled={!stagedChanges.length || workspace.publishing}
              onClick={() => {
                const groupIds = [...new Set(workspace.stagedChanges.map((change) => change.groupId))];
                void githubWorkspaceStore.unstage(groupIds);
              }}
            />
          </div>
        </header>
        <ChangeList
          changes={stagedChanges}
          actionIcon={RemoveIcon}
          actionTitle="Unstage"
          onAction={(id) => void githubWorkspaceStore.unstage([id])}
          onOpen={(change) => {
            openFile(change.path);
          }}
        />
      </section>
      <section className="space-box">
        <header className="space-header">
          <div>Working Space</div>
          <div className="op-icon-group">
            <Icon
              icon={UndoIcon}
              id="github-discard-working-all"
              size="18px"
              className="op-icon"
              toolTipContent="Discard all"
              disabled={!workingChanges.length || workspace.publishing}
              onClick={() => void discardWorkingChanges()}
            />
            <Icon
              icon={AddIcon}
              id="github-stage-all"
              size="18px"
              className="op-icon"
              toolTipContent="Stage all"
              disabled={!workingChanges.length || workspace.publishing}
              onClick={() => void githubWorkspaceStore.stageAll()}
            />
          </div>
        </header>
        <ChangeList
          changes={workingChanges}
          actionIcon={AddIcon}
          actionTitle="Stage"
          onAction={(id) => void githubWorkspaceStore.stage([id])}
          onOpen={(change) => {
            openFile(change.path);
          }}
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
