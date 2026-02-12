/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import AddIcon from '@mui/icons-material/AddOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import FileOpenIcon from '@mui/icons-material/FileOpenOutlined';
import RemoveIcon from '@mui/icons-material/RemoveOutlined';
import UndoIcon from '@mui/icons-material/UndoOutlined';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';
import React, { useCallback, useState } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { useGetDocSubItemsQuery } from '@/redux-api/docs';
import {
  useGetGitStatusQuery,
  useGitAddMutation,
  useGitRestoreMutation,
  useGitCommitMutation,
  useGitPullMutation,
  useGitPushMutation,
  Change,
} from '@/redux-api/git';
import { useCurPath, useRestoreEffects } from '@/utils/hooks/docHooks';
import { useSaveDoc } from '@/utils/hooks/reduxHooks';
import Toast from '@/utils/Toast';
import { confirm, normalizePath } from '@/utils/utils';

import './GitBox.scss';

const defaultStatus = {
  workspace: [],
  staged: [],
  changes: false,
  noGit: true,
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function GitBox() {
  const { navigate, curPath } = useCurPath();

  const { data: { noGit, workspace, staged } = defaultStatus, isLoading } = useGetGitStatusQuery();

  const [commitMsgTitle, setCommitMsgTitle] = useState('');
  const [commitMsgBody, setCommitMsgBody] = useState('');

  const [opLoading, setOpLoading] = useState(false);

  const restoreEffects = useRestoreEffects();

  const [add] = useGitAddMutation();
  const [restore] = useGitRestoreMutation();
  const [commit] = useGitCommitMutation();
  const [pull] = useGitPullMutation();
  const [push] = useGitPushMutation();

  const { refetch: refreshDocMenu } = useGetDocSubItemsQuery();

  const saveDoc = useSaveDoc();

  const addClick = useCallback(
    async (changePaths: string[]) => {
      if (changePaths.length === 0) {
        Toast.warn('no change needs to be added');
        return;
      }

      try {
        setOpLoading(true);

        await add(changePaths).unwrap();

        Toast('added');
      } catch (err) {
        Toast.error((err as Error).message);
      } finally {
        setOpLoading(false);
      }
    },
    [add, setOpLoading],
  );

  const restoreClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-shadow
    async (staged: boolean, changes: Change[]) => {
      if (changes.length === 0) {
        Toast.warn('no change needs to be restored');
        return;
      }

      // when it is in working space
      if (
        !staged &&
        !(await confirm({
          message: 'Are you sure to restore?',
        }))
      ) {
        return;
      }

      try {
        setOpLoading(true);

        await restore({ staged, changes }).unwrap();

        Toast('restored');

        restoreEffects(staged, changes);
      } catch (err) {
        Toast.error((err as Error).message);
      } finally {
        setOpLoading(false);
      }
    },
    [restore, setOpLoading, restoreEffects],
  );

  const pullClick = useCallback(
    async (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();

      try {
        setOpLoading(true);
        await pull().unwrap();

        Toast('updated');

        // refresh the menu
        await refreshDocMenu().unwrap();

        Toast('refreshed');
      } catch (err) {
        Toast.error((err as Error).message);
      } finally {
        setOpLoading(false);
      }
    },
    [setOpLoading, pull, refreshDocMenu],
  );

  const commitClick = async () => {
    if (staged.length === 0) {
      Toast.warn('no change to be committed');
      return;
    }

    if (
      !(await confirm({
        message: (
          <div className="commit-msg-box">
            <div>Title</div>
            <InputText
              type="text"
              value={commitMsgTitle}
              onChange={(e) => {
                setCommitMsgTitle(e.target.value);
              }}
              className="commit-msg-input"
              placeholder="commit message title"
            />
            <div>Body</div>
            <InputTextarea
              value={commitMsgBody}
              onChange={(e) => {
                setCommitMsgBody(e.target.value);
              }}
              className="commit-msg-input"
              placeholder="commit message body"
            />
          </div>
        ),
      }))
    ) {
      return;
    }

    if (commitMsgTitle.trim() === '') {
      Toast.warn('commit title can not be blank');
      return;
    }

    try {
      setOpLoading(true);

      await commit({
        title: commitMsgTitle,
        body: commitMsgBody,
      }).unwrap();

      Toast('committed');
    } catch (err) {
      Toast.error((err as Error).message);
    } finally {
      setOpLoading(false);
    }
  };

  const pushClick = useCallback(async () => {
    try {
      setOpLoading(true);
      await push().unwrap();

      Toast('pushed');
    } catch (err) {
      Toast.error((err as Error).message);
    } finally {
      setOpLoading(false);
    }
  }, [push, setOpLoading]);

  const openFile = (filePath: string) => {
    const norFilePath = normalizePath(filePath);
    if (norFilePath.includes('.')) {
      Toast.warn('This is not a markdown file');
      return;
    }

    if (normalizePath(curPath) !== norFilePath) {
      saveDoc();
      void navigate(`/article/${norFilePath as string}`);
    }
  };

  let content = (
    <>
      <section className="op-box">
        {opLoading && <i className="pi pi-spinner pi-spin" style={{ fontSize: '1rem' }} />}
        <Icon
          id="git-pull"
          icon={CloudDownloadOutlinedIcon}
          size="18px"
          toolTipContent="pull"
          onClick={pullClick}
          disabled={opLoading}
        />
        <Icon
          id="git-commit"
          icon={CheckOutlinedIcon}
          size="18px"
          toolTipContent="commit"
          onClick={commitClick}
          disabled={opLoading || staged.length === 0}
        />
        <Icon
          id="git-push"
          icon={CloudUploadOutlinedIcon}
          size="18px"
          toolTipContent="push"
          onClick={() => {
            void pushClick();
          }}
          disabled={opLoading}
        />
      </section>
      <section className="space-box">
        <header className="space-header">
          <div>Staged</div>
          <div className="op-icon-group">
            <Icon
              icon={RemoveIcon}
              id="git-staged-all-restore"
              size="18px"
              className="op-icon"
              toolTipContent="restore all to working space"
              onClick={async () => restoreClick(true, staged)}
            />
          </div>
        </header>
        {staged.length !== 0 ? (
          <ul className="git-changes">
            {staged.map((change) => (
              <li
                key={change.changePath}
                className={`space-header change-item ${change.status.toLowerCase() as string}`}
              >
                <div className="item-title" title={change.changePath}>
                  {change.changePath}
                </div>
                <div className="op-icon-group">
                  {change.status !== 'DELETED' && (
                    <Icon
                      icon={FileOpenIcon}
                      id="git-staged-file-open"
                      size="18px"
                      className="op-icon"
                      toolTipContent="open the file"
                      onClick={() => {
                        openFile(change.changePath.replace('.md', ''));
                      }}
                    />
                  )}
                  <Icon
                    icon={RemoveIcon}
                    id="git-staged-restore"
                    size="18px"
                    className="op-icon"
                    toolTipContent="restore to working space"
                    onClick={async () => restoreClick(true, [change])}
                  />
                  <span className="item-status">{change.status[0]}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="clean-space">
            <i className="pi pi-folder-open" />
            <span>No file is staged</span>
          </div>
        )}
      </section>
      <section className="space-box">
        <header className="space-header">
          <div>Working Space</div>
          <div className="op-icon-group">
            <Icon
              icon={UndoIcon}
              id="git-all-restore"
              size="18px"
              className="op-icon"
              toolTipContent="restore all the changes"
              onClick={async () => restoreClick(false, workspace)}
            />
            <Icon
              icon={AddIcon}
              id="git-all-add"
              size="18px"
              className="op-icon"
              toolTipContent="add all to the staged space"
              onClick={async () => addClick(workspace.map((change) => change.changePath as string))}
            />
          </div>
        </header>
        {workspace.length !== 0 ? (
          <ul className="git-changes">
            {workspace.map((change) => (
              <li
                key={change.changePath}
                className={`space-header change-item ${change.status.toLowerCase() as string}`}
              >
                <div className="item-title" title={change.changePath}>
                  {change.changePath}
                </div>
                <div className="op-icon-group">
                  {change.status !== 'DELETED' && (
                    <Icon
                      icon={FileOpenIcon}
                      id="git-file-open"
                      size="18px"
                      className="op-icon"
                      toolTipContent="open the file"
                      onClick={() => {
                        openFile(change.changePath.replace('.md', ''));
                      }}
                    />
                  )}
                  <Icon
                    icon={UndoIcon}
                    id="git-restore"
                    size="18px"
                    className="op-icon"
                    toolTipContent="restore the changes"
                    onClick={async () => restoreClick(false, [change])}
                  />
                  <Icon
                    icon={AddIcon}
                    id="git-add"
                    size="18px"
                    className="op-icon"
                    toolTipContent="add to the staged"
                    onClick={async () => addClick([change.changePath])}
                  />
                  <span className="item-status">{change.status[0]}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="clean-space">
            <i className="pi pi-folder-open" />
            <span>Working space is clean</span>
          </div>
        )}
      </section>
    </>
  );

  if (noGit) {
    content = (
      <div className="no-git-service">
        <i className="pi pi-exclamation-circle" />
        No git service found
      </div>
    );
  } else if (isLoading) {
    content = <ProgressSpinner style={{ width: '20px', height: '20px' }} />;
  }

  return <section className="git-box">{content}</section>;
}
