import React, { useState } from "react";
import { useCreateDocMutation } from "@/redux-api/docsApi";
import Toast from "@/utils/Toast";

type CreateDocProps = {
  isFile: boolean;
  clickOnFile: boolean;
  path: string[];
};

export default function CreateDoc({
  isFile, // create a file or folder
  clickOnFile,
  path, // path that is clicked
}: CreateDocProps) {
  const [inputName, setInputName] = useState("");

  const [createDoc] = useCreateDocMutation();

  const createDocConfirm = async () => {
    // remove the last path which is the clicked file name
    if (clickOnFile) {
      path = path.slice(0, path.length - 1);
    }

    // add the new file name
    path = path.concat(inputName);

    try {
      await createDoc({ path: path.join("-"), isFile: isFile }).unwrap();
      // hidden
      document.body.click();

      Toast("created successfully!", "SUCCESS");
    } catch {
      Toast("failed to create...", "ERROR");
    }
  };

  return (
    <div className="new-file-group-title">
      <input
        type="text"
        onChange={(e) => setInputName(e.target.value)}
        value={inputName}
        className="input"
        placeholder={`${isFile ? "file name" : "group name"}`}
      />
      <button className="btn" onClick={createDocConfirm}>
        confirm
      </button>
    </div>
  );
}
