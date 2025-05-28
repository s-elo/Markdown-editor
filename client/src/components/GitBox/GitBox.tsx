/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React, { useCallback, useState, useRef } from 'react';

import Modal from '../../utils/Modal/Modal';
import Spinner from '../../utils/Spinner/Spinner';

import { useRefreshDocsMutation } from '@/redux-api/docsApi';
import {
  useGetGitStatusQuery,
  useGitAddMutation,
  useGitRestoreMutation,
  useGitCommitMutation,
  useGitPullMutation,
  useGitPushMutation,
  GitRestoreType,
  Change,
} from '@/redux-api/gitApi';
import { useCurPath, useRestoreHandler } from '@/utils/hooks/docHooks';
import { useSaveDoc } from '@/utils/hooks/reduxHooks';
import Toast from '@/utils/Toast';

import './GitBox.less';

const defaultStatus = {
  workSpace: [],
  staged: [],
  err: 1,
  changes: false,
  noGit: true,
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function GitBox() {
  const { navigate, curPath } = useCurPath();

  const { data: { changes, noGit, workSpace, staged, err } = defaultStatus } = useGetGitStatusQuery();

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

  const [refreshDoc] = useRefreshDocsMutation();

  const saveDoc = useSaveDoc();

  const addClick = useCallback(
    async (changePaths: string[]) => {
      if (changePaths.length === 0) {
        Toast('no change needs to be added', 'WARNING');
        return;
      }

      try {
        setOpLoading(true);

        const resp = await add(changePaths).unwrap();

        if (resp.err === 1) {
          Toast(resp.message, 'ERROR', 2500);
          return;
        }

        Toast('added', 'SUCCESS');
      } catch {
        Toast('failed to add', 'ERROR', 2500);
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
        Toast('no change needs to be restored', 'WARNING');
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

        const resp = await restore({ staged, changes }).unwrap();

        if (resp.err === 1) {
          Toast(resp.message, 'ERROR', 2500);
          return;
        }

        Toast('restored', 'SUCCESS');

        restoreHandler(staged, changes);
      } catch {
        Toast('failed to restore', 'ERROR', 2500);
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
        const resp = await pull().unwrap();

        if (resp.err === 1) {
          Toast(resp.message, 'ERROR', 2500);
          return;
        }

        Toast('updated', 'SUCCESS');

        // refresh the menu
        await refreshDoc().unwrap();

        Toast('refreshed', 'SUCCESS');
      } catch {
        Toast('fail to pull or refresh', 'ERROR');
      } finally {
        setOpLoading(false);
      }
    },
    [setOpLoading, pull, refreshDoc],
  );

  const commitConfirm = useCallback(async () => {
    if (commitMsgTitle.trim() === '') {
      Toast('commit title can not be blank', 'WARNING');
      return;
    }

    try {
      setOpLoading(true);

      const resp = await commit({
        title: commitMsgTitle,
        body: commitMsgBody,
      }).unwrap();

      if (resp.err === 1) {
        Toast(resp.message, 'ERROR', 2500);
        return;
      }

      Toast('committed', 'SUCCESS');
    } catch {
      Toast('fail to commit', 'ERROR');
    } finally {
      setOpLoading(false);
    }
  }, [commit, commitMsgBody, commitMsgTitle, setOpLoading]);

  const pushClick = useCallback(async () => {
    try {
      setOpLoading(true);
      const resp = await push().unwrap();

      if (resp.err === 1) {
        Toast(resp.message, 'ERROR', 2500);
        return;
      }

      Toast('pushed', 'SUCCESS');
    } catch {
      Toast('fail to push', 'ERROR');
    } finally {
      setOpLoading(false);
    }
  }, [push, setOpLoading]);

  const openFile = (filePath: string) => {
    if (filePath.includes('.')) {
      Toast('This is not a markdown file', 'WARNING');
      return;
    }

    if (curPath.join('-') !== filePath) {
      saveDoc();
      void navigate(`/article/${filePath}`);
    }
  };

  return (
    <section className="git-box">
      {!noGit || err === 1 ? (
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
                    Toast(`no change to be committed`, 'WARNING');
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
                <span
                  className="material-icons-outlined icon-btn op-icon"
                  // style={{ pointerEvents: opLoading ? "none" : "auto" }}
                  title="restore all to working space"
                  role="button"
                  onClick={async () => restoreClick(true, staged)}
                >
                  remove
                </span>
              </div>
            </header>
            {staged.length !== 0 ? (
              <ul className="git-changes">
                {staged.map((change) => (
                  <li
                    key={change.changePath}
                    className={`space-header change-item ${change.status.toLowerCase() as string}`}
                  >
                    <div title={change.changePath}>{change.changePath}</div>
                    <div className="op-icon-group">
                      {change.status !== 'DELETED' && (
                        <span
                          className="material-icons-outlined icon-btn op-icon"
                          title="open the file"
                          role="button"
                          onClick={() => {
                            openFile(change.changePath.replace('.md', '').replaceAll('/', '-'));
                          }}
                        >
                          file_open
                        </span>
                      )}
                      <span
                        className="material-icons-outlined icon-btn op-icon"
                        title="restore to working space"
                        role="button"
                        onClick={async () => restoreClick(true, [change])}
                      >
                        remove
                      </span>
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
                <span
                  className="material-icons-outlined icon-btn op-icon"
                  title="restore all the changes"
                  role="button"
                  onClick={async () => restoreClick(false, workSpace)}
                >
                  undo
                </span>
                <span
                  className="material-icons-outlined icon-btn op-icon"
                  title="add all to the staged space"
                  role="button"
                  onClick={async () => addClick(workSpace.map((change) => change.changePath as string))}
                >
                  add
                </span>
              </div>
            </header>
            {workSpace.length !== 0 ? (
              <ul className="git-changes">
                {workSpace.map((change) => (
                  <li
                    key={change.changePath}
                    className={`space-header change-item ${change.status.toLowerCase() as string}`}
                  >
                    <div title={change.changePath}>{change.changePath}</div>
                    <div className="op-icon-group">
                      {change.status !== 'DELETED' && (
                        <span
                          className="material-icons-outlined icon-btn op-icon"
                          title="open the file"
                          role="button"
                          onClick={() => {
                            openFile(change.changePath.replace('.md', '').replaceAll('/', '-'));
                          }}
                        >
                          file_open
                        </span>
                      )}
                      <span
                        className="material-icons-outlined icon-btn op-icon"
                        title="restore the changes"
                        role="button"
                        onClick={async () => restoreClick(false, [change])}
                      >
                        undo
                      </span>
                      <span
                        className="material-icons-outlined icon-btn op-icon"
                        title="add to the staged"
                        role="button"
                        onClick={async () => addClick([change.changePath])}
                      >
                        add
                      </span>
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
      ) : (
        <div>found no git config</div>
      )}
    </section>
  );
}
