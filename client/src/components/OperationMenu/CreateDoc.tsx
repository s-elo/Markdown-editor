import React, { useState } from "react";
import { useCreateDocMutation, useGetDocMenuQuery } from "@/redux-api/docsApi";
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

  const { data: { norDocs } = { norDocs: {} } } = useGetDocMenuQuery();
  const [createDoc] = useCreateDocMutation();

  const createDocConfirm = async () => {
    // remove the last path if it is the clicked file name
    // add the new file name
    const convertedPath = clickOnFile
      ? path
          .slice(0, path.length - 1)
          .concat(inputName)
          .join("-")
      : path.concat(inputName).join("-");

    // check if there is a repeat name
    if (norDocs[convertedPath])
      return Toast("name already exsit in this folder!", "WARNING", 3000);

    try {
      await createDoc({ path: convertedPath, isFile: isFile }).unwrap();
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