import React, { useCallback, useEffect, useRef, useState } from "react";
import Modal from "../Modal/Modal";
import { getImgUrl } from "@/utils/utils";

import "./UploadImg.less";

export type UploadImgProps = {
  iconColor: string;
};

export default function UploadImg({ iconColor }: UploadImgProps) {
  const [modalShow, setModalShow] = useState(false);
  const [imgUrl, setImgUrl] = useState("");
  const uploadFile = useRef<File | null>(null);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

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
    },
    [setImgUrl, uploadFile]
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
    },
    [setImgUrl, uploadFile]
  );

  const uploadImg = useCallback(() => {
    if (uploadFile.current == null) return;

    console.log(uploadFile.current);
  }, [uploadFile]);

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
        style={{ color: iconColor }}
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
            <button className="upload-btn confirm-btn" onClick={uploadImg}>
              upload
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
