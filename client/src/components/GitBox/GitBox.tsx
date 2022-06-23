import React, { useCallback, useState, useRef } from "react";
import {
  useGetGitStatusQuery,
  useGitAddMutation,
  useGitRestoreMutation,
  useGitCommitMutation,
  useGitPullMutation,
  useGitPushMutation,
  GitRestoreType,
  Change,
} from "@/redux-api/gitApi";
import Toast from "@/utils/Toast";
import { useCurPath, useRetoreHandler } from "@/utils/hooks/docHookds";
import Spinner from "../../utils/Spinner/Spinner";

import "./GitBox.less";
import Modal from "../../utils/Modal/Modal";
import { useSaveDoc } from "@/utils/hooks/reduxHooks";

const defaultStatus = {
  workSpace: [],
  staged: [],
  err: 1,
  changes: false,
  noGit: true,
};

export default function GitBox() {
  const { routerHistory, curPath } = useCurPath();

  const { data: { changes, noGit, workSpace, staged, err } = defaultStatus } =
    useGetGitStatusQuery();

  const [commitMsgTitle, setCommitMsgTitle] = useState("");
  const [commitMsgBody, setCommitMsgBody] = useState("");

  const [opLoading, setOpLoading] = useState(false);
  // true when commit btn is clicked
  const [commitModalShow, setCommitModalShow] = useState(false);
  const [restoreConfirmShow, setRestoreConfirmShow] = useState(false);

  const restoreInfoRef = useRef<GitRestoreType | null>(null);

  const restoreHandler = useRetoreHandler();

  const [add] = useGitAddMutation();
  const [restore] = useGitRestoreMutation();
  const [commit] = useGitCommitMutation();
  const [pull] = useGitPullMutation();
  const [push] = useGitPushMutation();

  const saveDoc = useSaveDoc();

  const addClick = useCallback(
    async (changePaths: string[]) => {
      if (changePaths.length === 0)
        return Toast("no change needs to be added", "WARNING");

      try {
        setOpLoading(true);

        const resp = await add(changePaths).unwrap();

        if (resp.err === 1) return Toast(resp.message, "ERROR", 2500);

        Toast("added", "SUCCESS");
      } catch {
        Toast("failed to add", "ERROR", 2500);
      } finally {
        setOpLoading(false);
      }
    },
    [add, setOpLoading]
  );

  const restoreClick = useCallback(
    async (staged: boolean, changes: Change[]) => {
      if (changes.length === 0)
        return Toast("no change needs to be restored", "WARNING");

      // when it is in working space and modal is not being opened
      if (!staged && restoreConfirmShow === false) {
        restoreInfoRef.current = { staged, changes };
        return setRestoreConfirmShow(true);
      }

      try {
        setOpLoading(true);

        const resp = await restore({ staged, changes }).unwrap();

        if (resp.err === 1) return Toast(resp.message, "ERROR", 2500);

        Toast("restored", "SUCCESS");

        restoreHandler(staged, changes);
      } catch {
        Toast("failed to restore", "ERROR", 2500);
      } finally {
        setOpLoading(false);
      }
    },
    [restore, restoreConfirmShow, setOpLoading, restoreHandler]
  );

  const pullClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      try {
        setOpLoading(true);
        const resp = await pull().unwrap();

        if (resp.err === 1) return Toast(resp.message, "ERROR", 2500);

        Toast("updated", "SUCCESS");
      } catch {
        Toast("fail to pull", "ERROR");
      } finally {
        setOpLoading(false);
      }
    },
    [setOpLoading, pull]
  );

  const commitConfirm = useCallback(async () => {
    if (commitMsgTitle.trim() === "")
      return Toast("commit title can not be blank", "WARNING");

    try {
      setOpLoading(true);

      const resp = await commit({
        title: commitMsgTitle,
        body: commitMsgBody,
      }).unwrap();

      if (resp.err === 1) return Toast(resp.message, "ERROR", 2500);

      Toast("committed", "SUCCESS");
    } catch {
      Toast("fail to commit", "ERROR");
    } finally {
      setOpLoading(false);
    }
  }, [commit, commitMsgBody, commitMsgTitle, setOpLoading]);

  const pushClick = useCallback(async () => {
    try {
      setOpLoading(true);
      const resp = await push().unwrap();

      if (resp.err === 1) return Toast(resp.message, "ERROR", 2500);

      Toast("pushed", "SUCCESS");
    } catch {
      Toast("fail to push", "ERROR");
    } finally {
      setOpLoading(false);
    }
  }, [push, setOpLoading]);

  const openFile = (filePath: string) => {
    if (filePath.includes("."))
      return Toast("This is not a markdown file", "WARNING");

    if (curPath.join("-") !== filePath) {
      saveDoc();
      routerHistory.push(`/article/${filePath}`);
    }
  };

  return (
    <section className="git-box">
      {!noGit || err === 1 ? (
        <>
          <div className="op-box">
            <button
              className="git-btn btn"
              onClick={pullClick}
              disabled={opLoading}
            >
              {"pull"}
            </button>
            {changes && (
              <button
                className="git-btn btn"
                onClick={() => {
                  if (staged.length === 0)
                    return Toast(`no change to be committed`, "WARNING");

                  setCommitModalShow(true);
                }}
              >
                {"commit"}
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
                  onClick={() => restoreClick(true, staged)}
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
                    className={`space-header change-item ${change.status.toLowerCase()}`}
                  >
                    <div title={change.changePath}>{change.changePath}</div>
                    <div className="op-icon-group">
                      {change.status !== "DELETED" && (
                        <span
                          className="material-icons-outlined icon-btn op-icon"
                          title="open the file"
                          role="button"
                          onClick={() =>
                            openFile(
                              change.changePath
                                .replace(".md", "")
                                .replaceAll("/", "-")
                            )
                          }
                        >
                          file_open
                        </span>
                      )}
                      <span
                        className="material-icons-outlined icon-btn op-icon"
                        title="restore to working space"
                        role="button"
                        onClick={() => restoreClick(true, [change])}
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
                  onClick={() => restoreClick(false, workSpace)}
                >
                  undo
                </span>
                <span
                  className="material-icons-outlined icon-btn op-icon"
                  title="add all to the staged space"
                  role="button"
                  onClick={() =>
                    addClick(workSpace.map((change) => change.changePath))
                  }
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
                    className={`space-header change-item ${change.status.toLowerCase()}`}
                  >
                    <div title={change.changePath}>{change.changePath}</div>
                    <div className="op-icon-group">
                      {change.status !== "DELETED" && (
                        <span
                          className="material-icons-outlined icon-btn op-icon"
                          title="open the file"
                          role="button"
                          onClick={() =>
                            openFile(
                              change.changePath
                                .replace(".md", "")
                                .replaceAll("/", "-")
                            )
                          }
                        >
                          file_open
                        </span>
                      )}
                      <span
                        className="material-icons-outlined icon-btn op-icon"
                        title="restore the changes"
                        role="button"
                        onClick={() => restoreClick(false, [change])}
                      >
                        undo
                      </span>
                      <span
                        className="material-icons-outlined icon-btn op-icon"
                        title="add to the staged"
                        role="button"
                        onClick={() => addClick([change.changePath])}
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
          <button
            className="push-btn btn git-btn"
            onClick={() => pushClick()}
            disabled={opLoading}
          >
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
                  onChange={(e) => setCommitMsgTitle(e.target.value)}
                  className="commit-msg-input"
                  placeholder="commit message title"
                  onClick={(e) => e.stopPropagation()}
                />
                <div>Body</div>
                <textarea
                  value={commitMsgBody}
                  onChange={(e) => setCommitMsgBody(e.target.value)}
                  className="commit-msg-input"
                  placeholder="commit message body"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </Modal>
          )}
          {restoreConfirmShow && (
            <Modal
              showControl={setRestoreConfirmShow}
              confirmCallback={async (_, closeModal) => {
                if (restoreInfoRef.current) {
                  const { staged, changes } = restoreInfoRef.current;
                  restoreClick(staged, changes);
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
