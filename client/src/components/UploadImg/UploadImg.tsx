import React, { useCallback, useEffect, useRef, useState } from "react";
import { useUploadImgMutation } from "@/redux-api/imgStoreApi";
import Modal from "../Modal/Modal";
import { getImgUrl } from "@/utils/utils";

import "./UploadImg.less";
import Toast from "@/utils/Toast";

export default function UploadImg() {
  const [modalShow, setModalShow] = useState(false);
  const [imgUrl, setImgUrl] = useState("");
  const [imgName, setImgName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useRef<File | null>(null);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [uploadimgMutation] = useUploadImgMutation();

  const uploadClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!uploadInputRef.current) return;

      uploadInputRef.current.click();
    },
    [uploadInputRef]
  );

  const selectImg = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const imgFile = files[0];

      const url = getImgUrl(imgFile);

      setImgUrl(url);
      uploadFile.current = imgFile;
      setImgName(imgFile.name.split(".")[0]);
    },
    [setImgUrl, uploadFile, setImgName]
  );

  const pasteImg = useCallback(
    (e: ClipboardEvent) => {
      const items = (e.clipboardData && e.clipboardData.items) || [];
      let imgFile: File | null = null;

      if (items && items.length) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            imgFile = items[i].getAsFile();
            break;
          }
        }
      }

      if (!imgFile) return;

      const url = getImgUrl(imgFile);

      // this must be called before setImgUrl
      // since the setImgUrl will be run asyncly when this is native event binding
      uploadFile.current = imgFile;
      setImgUrl(url);
      setImgName(imgFile.name.split(".")[0]);
    },
    [setImgUrl, uploadFile, setImgName]
  );

  const uploadImg = useCallback(async () => {
    if (uploadFile.current == null) return;

    try {
      setIsUploading(true);

      const resp = await uploadimgMutation({
        imgFile: uploadFile.current,
        fileName: `${imgName}.${uploadFile.current.name.split(".")[1]}`,
      }).unwrap();

      if (resp.err === 0 && resp.status === 200)
        return Toast(resp.message, "SUCCESS");

      Toast(resp.message, "ERROR");
    } catch {
      Toast("failed to upload", "ERROR");
    } finally {
      setIsUploading(false);
    }
  }, [uploadFile, uploadimgMutation, imgName, setIsUploading]);

  // binding paste event on document
  useEffect(() => {
    if (modalShow) document.addEventListener("paste", pasteImg);
    // remove the event when the modal is closing
    else document.removeEventListener("paste", pasteImg);

    return () => {
      document.removeEventListener("paste", pasteImg);
    };
  }, [pasteImg, modalShow]);

  return (
    <>
      <span
        className="material-icons-outlined md-light icon-btn"
        onClick={() => {
          setModalShow(true);
        }}
        title="upload-img"
        role="button"
      >
        image
      </span>
      {modalShow && (
        <Modal showControl={setModalShow} btnControl={false}>
          <div
            className="upload-block"
            onClick={uploadClick}
            style={{ display: uploadFile.current == null ? "flex" : "none" }}
          >
            <div className="upload-icon">+</div>
            <div className="upload-prompt">
              click to upload an image or just ctrl+v
            </div>
          </div>
          <div
            role="button"
            className="reselect-prompt"
            onClick={uploadClick}
            hidden={uploadFile.current == null}
          >
            Click here to reselect or just ctrl+v
          </div>
          <img
            className="upload-img-show"
            src={imgUrl}
            alt="failed to upload"
            hidden={uploadFile.current == null}
          />
          <input
            type="text"
            className="img-name-input"
            placeholder="give an image name"
            value={imgName}
            onChange={(e) => setImgName(e.target.value)}
            style={{ display: uploadFile.current == null ? "none" : "block" }}
          />
          <input
            type="file"
            className="upload-input"
            ref={uploadInputRef}
            onChange={selectImg}
          />
          <div className="upload-btn-group">
            <button
              className="upload-btn cancel-btn"
              onClick={() => setModalShow(false)}
            >
              cancel
            </button>
            <button
              className="upload-btn confirm-btn"
              onClick={uploadImg}
              disabled={isUploading}
            >
              upload
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
