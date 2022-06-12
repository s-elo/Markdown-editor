import React, { useCallback, useState } from "react";
import {
  useGetGitStatusQuery,
  useGitCommitMutation,
  useGitPullMutation,
} from "@/redux-api/gitApi";
import Toast from "@/utils/Toast";
import Spinner from "../Spinner/Spinner";

import "./GitBox.less";
import Modal from "../Modal/Modal";

const defaultStatus = {
  workSpace: [],
  staged: [],
  err: 1,
  changes: false,
  noGit: true,
};

export default function GitBox() {
  const { data: { changes, noGit, workSpace, staged, err } = defaultStatus } =
    useGetGitStatusQuery();

  const [commitMsgTitle, setCommitMsgTitle] = useState("");
  const [commitMsgBody, setCommitMsgBody] = useState("");

  // true when pulling
  const [pullStatus, setPullStatus] = useState(false);
  // true when committing (pushing)
  const [commitModalShow, setCommitModalShow] = useState(false);

  const [commit] = useGitCommitMutation();
  const [pull] = useGitPullMutation();

  const pullClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      try {
        setPullStatus(true);
        await pull().unwrap();

        Toast("updated", "SUCCESS");
      } catch {
        Toast("fail to pull", "ERROR");
      } finally {
        setPullStatus(false);
      }
    },
    [setPullStatus, pull]
  );

  const commitConfirm = useCallback(async () => {
    if (commitMsgTitle.trim() === "")
      return Toast("commit title can not be blank", "WARNING");

    try {
      await commit({ title: commitMsgTitle, body: commitMsgBody }).unwrap();

      Toast("committed", "SUCCESS");
    } catch {
      Toast("fail to commit", "ERROR");
    }
  }, [commit, commitMsgBody, commitMsgTitle]);

  return (
    <section className="git-box">
      {!noGit || err === 1 ? (
        <>
          <div className="op-box">
            <button
              className="git-btn btn"
              onClick={pullClick}
              disabled={pullStatus}
            >
              {pullStatus ? <Spinner size="1rem" /> : "pull"}
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
          </div>
          <div className="space-box">
            <header className="space-header">
              <div>Staged</div>
              <div className="op-icon-group">
                <span
                  className="material-icons-outlined icon-btn op-icon"
                  title="restore all to working space"
                  role="button"
                >
                  remove
                </span>
              </div>
            </header>
            {staged.length !== 0 ? (
              <ul className="git-changes">
                {staged.map((change) => (
                  <li
                    className={`space-header change-item ${change.status.toLowerCase()}`}
                  >
                    <div title={change.changePath}>{change.changePath}</div>
                    <div className="op-icon-group">
                      <span
                        className="material-icons-outlined icon-btn op-icon"
                        title="open the file"
                        role="button"
                      >
                        file_open
                      </span>
                      <span
                        className="material-icons-outlined icon-btn op-icon"
                        title="restore to working space"
                        role="button"
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
                >
                  undo
                </span>
                <span
                  className="material-icons-outlined icon-btn op-icon"
                  title="add all to the staged space"
                  role="button"
                >
                  add
                </span>
              </div>
            </header>
            {workSpace.length !== 0 ? (
              <ul className="git-changes">
                {workSpace.map((change) => (
                  <li
                    className={`space-header change-item ${change.status.toLowerCase()}`}
                  >
                    <div title={change.changePath}>{change.changePath}</div>
                    <div className="op-icon-group">
                      <span
                        className="material-icons-outlined icon-btn op-icon"
                        title="open the file"
                        role="button"
                      >
                        file_open
                      </span>
                      <span
                        className="material-icons-outlined icon-btn op-icon"
                        title="restore the changes"
                        role="button"
                      >
                        undo
                      </span>
                      <span
                        className="material-icons-outlined icon-btn op-icon"
                        title="add to the staged"
                        role="button"
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
          {commitModalShow && (
            <Modal
              showControl={setCommitModalShow}
              confirmCallback={() => {
                commitConfirm();
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
        </>
      ) : (
        <div>found no git config</div>
      )}
    </section>
  );
}
