/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import Modal from '../../utils/Modal/Modal';

import { useUploadImgMutation } from '@/redux-api/imgStoreApi';
import Spinner from '@/utils/Spinner/Spinner';
import Toast from '@/utils/Toast';
import { getImgUrl } from '@/utils/utils';

import './UploadImg.less';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function UploadImg() {
  const [modalShow, setModalShow] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const [imgName, setImgName] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const uploadFile = useRef<File | null>(null);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [uploadImgMutation] = useUploadImgMutation();

  const uploadClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!uploadInputRef.current || isFetching) return;

      uploadInputRef.current.click();
    },
    [uploadInputRef, isFetching],
  );

  const selectImg = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const imgFile = files[0];

      const url = getImgUrl(imgFile);

      setImgUrl(url);
      uploadFile.current = imgFile;
      setImgName(imgFile.name.split('.')[0]);
    },
    [setImgUrl, uploadFile, setImgName],
  );

  const pasteImg = useCallback(
    async (e: ClipboardEvent) => {
      if (!e.clipboardData?.items || e.clipboardData.items.length === 0) return;

      let imgFile: File | null = null;

      const item = e.clipboardData.items[0];

      if (item.kind === 'file') {
        imgFile = item.getAsFile();
      } else if (item.kind === 'string') {
        setIsFetching(true);
        await new Promise<void>((res) => {
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          item.getAsString(async (str) => {
            const resp = await fetch(str);
            const data = await resp.blob();
            imgFile = new File([data], data.type.replace('/', '.'), {
              type: data.type,
            });
            res();
          });
        }).catch((reason) => {
          Toast(String(reason), 'ERROR');
          imgFile = null;
        });
        setIsFetching(false);
      }

      if (!imgFile) return;

      const url = getImgUrl(imgFile);

      // this must be called before setImgUrl
      // since the setImgUrl will be run asyncly when this is native event binding
      uploadFile.current = imgFile;
      setImgUrl(url);
      setImgName(imgFile.name.split('.')[0]);
    },
    [setImgUrl, uploadFile, setImgName, setIsFetching],
  );

  const uploadImg = useCallback(async () => {
    if (uploadFile.current == null) {
      Toast('please select or paste an image', 'WARNING');
      return;
    }

    try {
      const resp = await uploadImgMutation({
        imgFile: uploadFile.current,
        fileName: `${imgName}.${uploadFile.current.name.split('.')[1]}`,
      }).unwrap();

      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      if (resp.err === 0 && resp.status === 200) {
        Toast(resp.message, 'SUCCESS');
        return;
      }

      Toast(resp.message, 'ERROR');
    } catch {
      Toast('failed to upload', 'ERROR');
    }
  }, [uploadFile, uploadImgMutation, imgName]);

  // binding paste event on document
  useEffect(() => {
    if (modalShow) document.addEventListener('paste', pasteImg);
    // remove the event when the modal is closing
    else document.removeEventListener('paste', pasteImg);

    return () => {
      document.removeEventListener('paste', pasteImg);
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
        <Modal
          showControl={setModalShow}
          confirmBtnText="upload"
          confirmCallback={async (setLoading) => {
            setLoading(true);
            await uploadImg();
            setLoading(false);
          }}
        >
          <div
            className="upload-block"
            onClick={uploadClick}
            style={{ display: uploadFile.current == null ? 'flex' : 'none' }}
          >
            {!isFetching ? (
              <>
                <div className="upload-icon">+</div>
                <div className="upload-prompt">click to upload an image or just ctrl+v</div>
              </>
            ) : (
              <Spinner />
            )}
          </div>
          <div role="button" className="reselect-prompt" onClick={uploadClick} hidden={uploadFile.current == null}>
            {!isFetching ? 'Click here to reselect or just ctrl+v' : <Spinner size="1rem" />}
          </div>
          <img className="upload-img-show" src={imgUrl} alt="failed to upload" hidden={uploadFile.current == null} />
          <input
            type="text"
            className="img-name-input"
            placeholder="give an image name"
            value={imgName}
            onChange={(e) => {
              setImgName(e.target.value);
            }}
            style={{ display: uploadFile.current == null ? 'none' : 'block' }}
          />
          <input type="file" className="upload-input" ref={uploadInputRef} onChange={selectImg} />
        </Modal>
      )}
    </>
  );
}
