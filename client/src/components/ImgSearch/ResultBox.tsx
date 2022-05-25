import React, { useRef, useState } from "react";
import { useDeleteImgMutation } from "@/redux-api/imgStoreApi";
import { ImgDataType } from "@/redux-api/imgStoreApi";
import Modal from "../Modal/Modal";
import Spinner from "../Spinner/Spinner";
import Toast from "@/utils/Toast";

type ResultBoxProps = {
  results: ImgDataType[];
  isShow: boolean;
};
export default function ResultBox({ results, isShow }: ResultBoxProps) {
  const [isDeleting, setIsDeleting] = useState<boolean[]>(
    new Array(results.length).fill(false)
  );
  const [deleteConfirmShow, setDeletConfirmShow] = useState(false);

  const deleteInfoRef = useRef({ imgName: "", idx: 0 });

  const [deleteImgMutation] = useDeleteImgMutation();

  const copyInfo = async (info: string) => {
    await navigator.clipboard.writeText(info);
    Toast("copied!", "SUCCESS");
  };
  const deleteImg = async (imgName: string, idx: number) => {
    setIsDeleting((isDeleting) => {
      const deletStatus = [...isDeleting];
      deletStatus[idx] = true;
      return deletStatus;
    });

    try {
      const resp = await deleteImgMutation(imgName).unwrap();

      if (resp.err === 0) return Toast("deleted!", "SUCCESS");

      throw new Error();
    } catch {
      Toast("failed to delete", "ERROR");
    } finally {
      setIsDeleting((isDeleting) => {
        const deletStatus = [...isDeleting];
        deletStatus[idx] = false;
        return deletStatus;
      });
    }
  };
  return (
    <div
      className="search-results-box"
      style={{
        display: isShow ? "flex" : "none",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {results.length === 0 ? (
        <div>no images</div>
      ) : (
        results.map((imgData, idx) => (
          <div className="result-item" key={imgData.etag}>
            <div className="img-info">
              <div
                className="img-info-item"
                title="click to copy"
                onClick={() => copyInfo(imgData.url)}
              >
                <span className="info-label">url:</span>
                {imgData.url}
              </div>
              <div
                className="img-info-item"
                title="click to copy"
                onClick={() => copyInfo(imgData.name)}
              >
                <span className="info-label">name:</span>
                {imgData.name}
              </div>
              <div
                className="img-info-item"
                style={{ cursor: isDeleting[idx] ? "default" : "pointer" }}
              >
                {isDeleting[idx] ? (
                  <Spinner size="1rem" />
                ) : (
                  <span
                    role="button"
                    className="material-icons-outlined"
                    title="delete"
                    onClick={() => {
                      setDeletConfirmShow(true);
                      deleteInfoRef.current = { imgName: imgData.name, idx };
                    }}
                  >
                    delete
                  </span>
                )}
              </div>
            </div>
            <img src={imgData.url} alt={imgData.name} />
          </div>
        ))
      )}
      {deleteConfirmShow && (
        <Modal
          showControl={setDeletConfirmShow}
          confirmCallback={() => {
            const { imgName, idx } = deleteInfoRef.current;
            deleteImg(imgName, idx);
          }}
        >
          Are you sure to delete it?
        </Modal>
      )}
    </div>
  );
}
