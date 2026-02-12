/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import Modal from '../../utils/Modal/Modal';
import Spinner from '../../utils/Spinner/Spinner';

import { useDeleteImgMutation, useRenameImgMutation, ImgDataType } from '@/redux-api/imgStoreApi';
import Toast from '@/utils/Toast';
import { hightLight, scrollToBottomListener } from '@/utils/utils';

interface ResultBoxProps {
  results: ImgDataType[];
  searchContent?: string;
}
// eslint-disable-next-line @typescript-eslint/naming-convention
export default function ResultBox({ results, searchContent = '' }: ResultBoxProps) {
  const [showNum, setShowNum] = useState(4);
  const [isDeleting, setIsDeleting] = useState<boolean[]>(new Array(results.length).fill(false));
  const [deleteConfirmShow, setDeleteConfirmShow] = useState(false);
  const [renameShow, setRenameShow] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const deleteInfoRef = useRef({ imgName: '', idx: 0 });
  const renameSelectedName = useRef('');
  const resultBoxRef = useRef<HTMLDivElement>(null);

  const [deleteImgMutation] = useDeleteImgMutation();
  const [renameImgMutation] = useRenameImgMutation();

  const copyInfo = useCallback(async (info: string) => {
    await navigator.clipboard.writeText(info);
    Toast('copied!');
  }, []);

  const deleteImg = useCallback(
    async (imgName: string, idx: number) => {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      setIsDeleting((isDeleting) => {
        const deleteStatus = [...isDeleting];
        deleteStatus[idx] = true;
        return deleteStatus;
      });

      try {
        await deleteImgMutation(imgName).unwrap();
      } catch (err) {
        Toast.error((err as Error).message);
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-shadow
        setIsDeleting((isDeleting) => {
          const deleteStatus = [...isDeleting];
          deleteStatus[idx] = false;
          return deleteStatus;
        });
      }
    },
    [setIsDeleting, deleteImgMutation],
  );

  const rename = useCallback(async () => {
    if (renameSelectedName.current.split('.')[0] === renameValue) {
      Toast.warn('the name has not been changed');
      return;
    }

    try {
      await renameImgMutation({
        fileName: renameSelectedName.current,
        newName: `${renameValue}.${renameSelectedName.current.split('.')[1]}`,
      }).unwrap();
    } catch (err) {
      Toast.error((err as Error).message);
    }
  }, [renameImgMutation, renameValue]);

  /**
   * scroll down to the bottom to show more images
   */
  useEffect(() => {
    if (!resultBoxRef.current) return;

    // every time when the results changed, reset to only show 4 images
    setShowNum(4);

    const remover = scrollToBottomListener(resultBoxRef.current, () => {
      setShowNum((num) => (num + 4 > results.length ? results.length : num + 4));
    });

    return remover as () => void;
  }, [results]);

  return (
    <>
      <div
        className="search-results-box"
        ref={resultBoxRef}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
      >
        {results.length !== 0 &&
          results.slice(0, showNum).map((imgData, idx) => (
            <div className="result-item" key={imgData.etag}>
              <div className="img-info">
                <div
                  className="img-info-item"
                  title={`click to copy: ${imgData.url as string}`}
                  onClick={() => void copyInfo(imgData.url)}
                >
                  <span className="info-label">url:</span>
                  {imgData.url}
                </div>
                <div className="img-info-item" title="click to copy" onClick={() => void copyInfo(imgData.name)}>
                  <span className="info-label">name:</span>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: hightLight(imgData.name, searchContent.split(' ')),
                    }}
                  ></span>
                  <span
                    className="rename-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameValue(imgData.name.split('.')[0]);
                      renameSelectedName.current = imgData.name;
                      setRenameShow(true);
                    }}
                  >
                    rename
                  </span>
                </div>
                <div className="img-info-item" style={{ cursor: isDeleting[idx] ? 'default' : 'pointer' }}>
                  {isDeleting[idx] ? (
                    <Spinner size="1rem" />
                  ) : (
                    <span
                      role="button"
                      className="material-icons-outlined"
                      title="delete"
                      onClick={() => {
                        setDeleteConfirmShow(true);
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
                  e.currentTarget.classList.add('img-error');
                  e.currentTarget.classList.remove('img-loading');
                }}
                onLoad={(e) => {
                  e.currentTarget.classList.remove('img-loading');
                }}
              />
            </div>
          ))}
      </div>
      {deleteConfirmShow && (
        <Modal
          showControl={setDeleteConfirmShow}
          confirmCallback={(_, closeModal) => {
            closeModal();
            const { imgName, idx } = deleteInfoRef.current;
            void deleteImg(imgName, idx);
          }}
        >
          Are you sure to delete it?
        </Modal>
      )}
      {renameShow && (
        <Modal
          showControl={setRenameShow}
          confirmCallback={(setLoading) => {
            setLoading(true);
            void rename().then(() => {
              setLoading(false);
            });
          }}
        >
          <input
            type="text"
            className="upload-img-rename-input"
            placeholder="give a name"
            value={renameValue}
            onChange={(e) => {
              setRenameValue(e.target.value);
            }}
          />
        </Modal>
      )}
    </>
  );
}
