/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import AddIcon from '@mui/icons-material/AddOutlined';
import FileOpenIcon from '@mui/icons-material/FileOpenOutlined';
import RemoveIcon from '@mui/icons-material/RemoveOutlined';
import UndoIcon from '@mui/icons-material/UndoOutlined';
import { ProgressSpinner } from 'primereact/progressspinner';
import React, { useCallback, useState, useRef } from 'react';

import Modal from '../../utils/Modal/Modal';
import Spinner from '../../utils/Spinner/Spinner';

import { Icon } from '@/components/Icon/Icon';
import { useGetDocSubItemsQuery } from '@/redux-api/docs';
import {
  useGetGitStatusQuery,
  useGitAddMutation,
  useGitRestoreMutation,
  useGitCommitMutation,
  useGitPullMutation,
  useGitPushMutation,
  GitRestoreType,
  Change,
} from '@/redux-api/git';
import { useCurPath, useRestoreHandler } from '@/utils/hooks/docHooks';
import { useSaveDoc } from '@/utils/hooks/reduxHooks';
import Toast from '@/utils/Toast';
import { normalizePath } from '@/utils/utils';

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

  const { data: { changes, noGit, workspace, staged } = defaultStatus, isLoading } = useGetGitStatusQuery();

  const [commitMsgTitle, setCommitMsgTitle] = useState('');
  const [commitMsgBody, setCommitMsgBody] = useState('');

  const [opLoading, setOpLoading] = useState(false);
  // true when commit btn is clicked
  const [commitModalShow, setCommitModalShow] = useState(false);
  const [restoreConfirmShow, setRestoreConfirmShow] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  const restoreInfoRef = useRef<GitRestoreType | null>(null);

  const restoreHandler = useRestoreHandler();

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

      // when it is in working space and modal is not being opened
      if (!staged && !restoreConfirmShow) {
        restoreInfoRef.current = { staged, changes };
        setRestoreConfirmShow(true);
        return;
      }

      try {
        setOpLoading(true);

        await restore({ staged, changes }).unwrap();

        Toast('restored');

        restoreHandler(staged, changes);
      } catch (err) {
        Toast.error((err as Error).message);
      } finally {
        setOpLoading(false);
      }
    },
    [restore, restoreConfirmShow, setOpLoading, restoreHandler],
  );

  const pullClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
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

  const commitConfirm = useCallback(async () => {
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
  }, [commit, commitMsgBody, commitMsgTitle, setOpLoading]);

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

  return (
    <section className="git-box">
      {!noGit ? (
        <>
          <div className="op-box">
            <button className="git-btn btn" onClick={pullClick} disabled={opLoading}>
              {'pull'}
            </button>
            {changes && (
              <button
                className="git-btn btn"
                onClick={() => {
                  if (staged.length === 0) {
                    Toast.warn('no change to be committed');
                    return;
                  }

                  setCommitModalShow(true);
                }}
              >
                {'commit'}
              </button>
            )}
            {opLoading && <Spinner size="1rem" />}
          </div>
          <div className="space-box">
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
              <div className="clean-space">no file is staged</div>
            )}
          </div>
          <div className="space-box">
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
              <div className="clean-space">working space is clean</div>
            )}
          </div>
          <button className="push-btn btn git-btn" onClick={async () => pushClick()} disabled={opLoading}>
            push
          </button>
          {commitModalShow && (
            <Modal
              showControl={setCommitModalShow}
              confirmCallback={async (setLoading, closeModal) => {
                setLoading(true);
                await commitConfirm();
                setLoading(false);

                closeModal();
              }}
            >
              <div className="commit-msg-box">
                <div>Title</div>
                <input
                  type="text"
                  value={commitMsgTitle}
                  onChange={(e) => {
                    setCommitMsgTitle(e.target.value);
                  }}
                  className="commit-msg-input"
                  placeholder="commit message title"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
                <div>Body</div>
                <textarea
                  value={commitMsgBody}
                  onChange={(e) => {
                    setCommitMsgBody(e.target.value);
                  }}
                  className="commit-msg-input"
                  placeholder="commit message body"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              </div>
            </Modal>
          )}
          {restoreConfirmShow && (
            <Modal
              showControl={setRestoreConfirmShow}
              confirmCallback={(_, closeModal) => {
                if (restoreInfoRef.current) {
                  // eslint-disable-next-line @typescript-eslint/no-shadow
                  const { staged, changes } = restoreInfoRef.current;
                  void restoreClick(staged, changes);
                }

                closeModal();
              }}
            >
              Are you sure to restore?
            </Modal>
          )}
        </>
      ) : isLoading ? (
        <ProgressSpinner style={{ width: '20px', height: '20px' }} />
      ) : (
        <div>found no git config</div>
      )}
    </section>
  );
}
