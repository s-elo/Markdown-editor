import React, { useCallback, useState } from "react";
import { useModifyDocNameMutation } from "@/redux-api/docsApi";
import Toast from "@/utils/Toast";
import { useModifyNameHandler } from "@/utils/hooks/docHookds";
import { DOC } from "@/redux-api/docsApiType";

type ModifyNameProps = {
  isFile: boolean;
  path: string[];
  siblings: DOC[];
};

export default function ModifyName({
  isFile, // a file or folder
  path, // path that is clicked with original name
  siblings, // for repeated name checking
}: ModifyNameProps) {
  // initialized as the original name
  const [newName, setNewName] = useState(path.slice(-1)[0]);

  const [modifyName] = useModifyDocNameMutation();
  const modifyNameHandler = useModifyNameHandler();

  const modifyConfirm = useCallback(async () => {
    // original path that is being modified
    const modifyPath = path.join("-");
    const newPath = path.slice(0, -1).concat(newName).join("-");

    if (siblings.some((doc) => doc.path.join("-") === newPath))
      return Toast("the name is repeated!", "WARNING");

    try {
      await modifyName({
        modifyPath,
        newName,
        isFile,
      }).unwrap();

      modifyNameHandler(path, newPath, isFile);

      Toast("modified successfully!", "SUCCESS");
    } catch {
      Toast("failed to modify...", "ERROR");
    }
  }, [path, isFile, siblings, newName, modifyNameHandler, modifyName]);

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
