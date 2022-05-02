import React, { useState } from "react";
import { useModifyDocNameMutation } from "@/redux-api/docsApi";
import Toast from "@/utils/Toast";

type ModifyNameProps = {
  isFile: boolean;
  path: string[];
  siblings: string[];
};

export default function ModifyName({
  isFile, // a file or folder
  path, // path that is clicked
  siblings, // for repeated name checking
}: ModifyNameProps) {
  // initialized as the original name
  const [newName, setNewName] = useState(path.slice(-1)[0]);

  const [modifyName] = useModifyDocNameMutation();

  const modifyConfirm = async () => {
    const modifyPath = path.join("-");
    if (siblings.includes(modifyPath))
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
      <button className="btn" onClick={modifyConfirm}>
        confirm
      </button>
    </div>
  );
}
