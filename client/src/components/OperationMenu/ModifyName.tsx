import React, { useState } from "react";
import { useSelector } from "react-redux";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { useModifyDocNameMutation } from "@/redux-api/docsApi";
import Toast from "@/utils/Toast";

import { DOC } from "@/redux-api/docsApiType";

type ModifyNameProps = {
  isFile: boolean;
  path: string[];
  siblings: DOC[];
};

export default function ModifyName({
  isFile, // a file or folder
  path, // path that is clicked
  siblings, // for repeated name checking
}: ModifyNameProps) {
  const { themes, curTheme } = useSelector(selectGlobalOpts);
  const { backgroundColor } = themes[curTheme];

  // initialized as the original name
  const [newName, setNewName] = useState(path.slice(-1)[0]);

  const [modifyName] = useModifyDocNameMutation();

  const modifyConfirm = async () => {
    // original path that is being modified
    const modifyPath = path.join("-");

    if (
      siblings.some(
        (doc) =>
          doc.path.join("-") === path.slice(0, -1).concat(newName).join("-")
      )
    )
      return Toast("the name is repeated!", "WARNING");

    try {
      await modifyName({
        modifyPath,
        newName,
        isFile,
      }).unwrap();

      // hidden
      document.body.click();

      Toast("modified successfully!", "SUCCESS");
    } catch {
      Toast("failed to modify...", "ERROR");
    }
  };

  return (
    <div className="new-file-group-title">
      <input
        type="text"
        onChange={(e) => setNewName(e.target.value)}
        value={newName}
        className="input"
        placeholder="new name"
      />
      <button
        className="btn"
        onClick={modifyConfirm}
        style={{ backgroundColor }}
      >
        confirm
      </button>
    </div>
  );
}
