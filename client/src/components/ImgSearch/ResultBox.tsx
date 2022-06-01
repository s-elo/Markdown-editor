import React, { useRef, useState } from "react";
import {
  useDeleteImgMutation,
  useRenameImgMutation,
} from "@/redux-api/imgStoreApi";
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
  const [renameShow, setRenameShow] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const deleteInfoRef = useRef({ imgName: "", idx: 0 });
  const renameSelectedName = useRef("");

  const [deleteImgMutation] = useDeleteImgMutation();
  const [renameImgMutation] = useRenameImgMutation();

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

  const rename = async () => {
    try {
      const resp = await renameImgMutation({
        fileName: renameSelectedName.current,
        newName: `${renameValue}.${renameSelectedName.current.split(".")[1]}`,
      }).unwrap();

      if (resp.err === 0) return Toast(resp.message, "SUCCESS");

      throw new Error(resp.message);
    } catch (err) {
      Toast(String(err), "ERROR");
    }
  };

  return (
    <>
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
                  title={`click to copy: ${imgData.url}`}
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
                  <span
                    className="rename-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameValue(imgData.name.split(".")[0]);
                      renameSelectedName.current = imgData.name;
                      setRenameShow(true);
                    }}
                  >
                    rename
                  </span>
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
      </div>
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
      {renameShow && (
        <Modal showControl={setRenameShow} confirmCallback={rename}>
          <input
            type="text"
            className="upload-img-rename-input"
            placeholder="give a name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
          />
        </Modal>
      )}
    </>
  );
}
