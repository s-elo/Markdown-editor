import React, { useState } from "react";
import Modal from "../Modal/Modal";

export type UploadImgProps = {
  iconColor: string;
};

export default function UploadImg({ iconColor }: UploadImgProps) {
  const [modalShow, setModalShow] = useState(false);

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
        <Modal showControl={setModalShow}>
          <div
            style={{
              width: "30rem",
              height: "30rem",
              backgroundColor: "brown",
            }}
          >
            this is a modal
          </div>
        </Modal>
      )}
    </>
  );
}
