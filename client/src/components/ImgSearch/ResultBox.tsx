import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  useDeleteImgMutation,
  useRenameImgMutation,
} from "@/redux-api/imgStoreApi";
import { ImgDataType } from "@/redux-api/imgStoreApi";
import Modal from "../../utils/Modal/Modal";
import Spinner from "../../utils/Spinner/Spinner";
import Toast from "@/utils/Toast";
import { hightlight, scrollToBottomListener } from "@/utils/utils";

type ResultBoxProps = {
  results: ImgDataType[];
  searchContent?: string;
};
export default function ResultBox({
  results,
  searchContent = "",
}: ResultBoxProps) {
  const [showNum, setShowNum] = useState(4);
  const [isDeleting, setIsDeleting] = useState<boolean[]>(
    new Array(results.length).fill(false)
  );
  const [deleteConfirmShow, setDeletConfirmShow] = useState(false);
  const [renameShow, setRenameShow] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const deleteInfoRef = useRef({ imgName: "", idx: 0 });
  const renameSelectedName = useRef("");
  const resultBoxRef = useRef<HTMLDivElement>(null);

  const [deleteImgMutation] = useDeleteImgMutation();
  const [renameImgMutation] = useRenameImgMutation();

  const copyInfo = useCallback(async (info: string) => {
    await navigator.clipboard.writeText(info);
    Toast("copied!", "SUCCESS");
  }, []);

  const deleteImg = useCallback(
    async (imgName: string, idx: number) => {
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
    },
    [setIsDeleting, deleteImgMutation]
  );

  const rename = useCallback(async () => {
    if (renameSelectedName.current.split(".")[0] === renameValue)
      return Toast("the name has not been changed", "WARNING");

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
  }, [renameImgMutation, renameValue]);

  /**
   * scroll down to the bottom to show more images
   */
  useEffect(() => {
    if (!resultBoxRef.current) return;

    // every time when the reuslts changed, reset to only show 4 images
    setShowNum(4);

    const remover = scrollToBottomListener(resultBoxRef.current, () => {
      setShowNum((num) =>
        num + 4 > results.length ? results.length : num + 4
      );
    });

    return remover;
  }, [results]);

  return (
    <>
      <div
        className="search-results-box"
        ref={resultBoxRef}
        onMouseDown={(e) => e.preventDefault()}
      >
        {results.length !== 0 &&
          results.slice(0, showNum).map((imgData, idx) => (
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
                  <span
                    dangerouslySetInnerHTML={{
                      __html: hightlight(
                        imgData.name,
                        searchContent.split(" ")
                      ),
                    }}
                  ></span>
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
              <img
                className="img-store-img img-loading"
                src={imgData.url}
                alt={imgData.name}
                onError={(e) => {
                  e.currentTarget.classList.add("img-error");
                  e.currentTarget.classList.remove("img-loading");
                }}
                onLoad={(e) => e.currentTarget.classList.remove("img-loading")}
              />
            </div>
          ))}
      </div>
      {deleteConfirmShow && (
        <Modal
          showControl={setDeletConfirmShow}
          confirmCallback={(_, closeModal) => {
            closeModal();
            const { imgName, idx } = deleteInfoRef.current;
            deleteImg(imgName, idx);
          }}
        >
          Are you sure to delete it?
        </Modal>
      )}
      {renameShow && (
        <Modal
          showControl={setRenameShow}
          confirmCallback={async (setLoading) => {
            setLoading(true);
            await rename();
            setLoading(false);
          }}
        >
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
