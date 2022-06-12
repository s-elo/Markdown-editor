import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import "./Modal.less";

export type ModelProps = {
  children: React.ReactChild[] | React.ReactChild;
  showControl: React.Dispatch<React.SetStateAction<boolean>>;
  btnControl?: boolean;
  iconControl?: boolean;
  cancelCallback?: () => void;
  confirmCallback?: (
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    handleClose: () => void
  ) => void;
  cancalBtnText?: string;
  confirmBtnText?: string;
};

export default function Modal({
  children,
  btnControl = true,
  iconControl = true,
  showControl,
  cancelCallback,
  confirmCallback,
  cancalBtnText = "cancal",
  confirmBtnText = "confirm",
}: ModelProps) {
  const [confirmLoading, setConfirmLoading] = useState(false);

  const modalBoxDom = useMemo(() => {
    const dom = document.createElement("div");

    dom.classList.add("modal-mask");

    return dom;
  }, []);

  const handleClose = () => {
    const modalRootDom = document.getElementById("modal-root");

    modalRootDom?.removeChild(modalBoxDom);

    cancelCallback && cancelCallback();

    showControl(false);
  };

  useEffect(() => {
    const modalRootDom = document.getElementById("modal-root");

    modalRootDom?.appendChild(modalBoxDom);

    return () => {
      if (modalRootDom?.children.length !== 0)
        modalRootDom?.removeChild(modalBoxDom);
    };
  }, [modalBoxDom]);

  const modalWrapper = (
    <div className="modal-wrapper">
      {iconControl && (
        <div
          className="close-icon"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
        >
          ×
        </div>
      )}
      <div className="children-box">{children}</div>
      {btnControl && (
        <div className="cancel-confirm">
          <button
            className="cancel-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          >
            {cancalBtnText}
          </button>
          <button
            className="confirm-btn"
            disabled={confirmLoading}
            onClick={(e) => {
              e.stopPropagation();
              if (confirmCallback) {
                confirmCallback(setConfirmLoading, handleClose);
              } else {
                handleClose();
              }
            }}
          >
            {confirmBtnText}
          </button>
        </div>
      )}
    </div>
  );
  return createPortal(modalWrapper, modalBoxDom);
}
