import React, { useState } from "react";
import {
  useGetGitStatusQuery,
  useGitCommitMutation,
  useGitPullMutation,
} from "@/redux-api/gitApi";
import Toast from "@/utils/Toast";
import Spinner from "../Spinner/Spinner";

import "./GitBox.less";

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

  const [commitMsg, setCommitMsg] = useState("");
  // true when pulling
  const [pullStatus, setPullStatus] = useState(false);
  // true when committing (pushing)
  const [commitStatus, setCommitStatus] = useState(false);

  const [commit] = useGitCommitMutation();
  const [pull] = useGitPullMutation();

  const pullClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
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
  };

  const commitClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (commitMsg.trim() === "")
      return Toast("commit message can not be blank", "WARNING");

    try {
      setCommitStatus(true);
      await commit({ message: commitMsg }).unwrap();

      Toast("committed", "SUCCESS");
    } catch {
      Toast("fail to commit", "ERROR");
    } finally {
      setCommitStatus(false);
    }
  };

  return (
    <span
      title="git-sync"
      role="button"
      className="material-icons-outlined icon-btn"
    >
      {changes ? "sync_problem" : "sync"}
      <section
        className="git-operation"
        style={{ left: changes ? "-10rem" : "-1rem" }}
      >
        {!noGit ? (
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
                  onClick={commitClick}
                  disabled={commitStatus}
                >
                  {commitStatus ? <Spinner size="1rem" /> : "commit"}
                </button>
              )}
            </div>
            <br />
            {changes && (
              <input
                type="text"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                className="commit-msg-input input"
                placeholder="commit message"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </>
        ) : (
          <div>found no git config</div>
        )}
      </section>
    </span>
  );
}
