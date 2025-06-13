/* eslint-disable @typescript-eslint/no-magic-numbers */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import CreateDoc from './CreateDoc';
import ModifyName from './ModifyName';
import Modal from '../../utils/Modal/Modal';

import { useGetNorDocsQuery, useDeleteDocMutation, useCopyCutDocMutation } from '@/redux-api/docsApi';
import { updateCopyCut, selectOperationMenu } from '@/redux-feature/operationMenuSlice';
import { useDeleteHandler, useCopyCutHandler } from '@/utils/hooks/docHooks';
import Toast from '@/utils/Toast';
import { normalizePath } from '@/utils/utils';
import './OperationMenu.scss';

interface Props {
  xPos: number;
  yPos: number;
  path: string[];
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function OperationMenu({ xPos, yPos, path }: Props) {
  const { data: norDocs = {} } = useGetNorDocsQuery();

  const copyCutHandler = useCopyCutHandler();
  const deleteHandler = useDeleteHandler();

  const norPath = normalizePath(path);

  const { doc: norCurDoc, parent: curDocParent } = norDocs[norPath] ?? {};

  const { copyPath, cutPath } = useSelector(selectOperationMenu);

  const [createFileShow, setCreateFileShow] = useState(false);
  const [createGroupShow, setCreateGroupShow] = useState(false);
  const [modifyNameShow, setModifyNameShow] = useState(false);

  const [deleteConfirmShow, setDeleteConfirmShow] = useState(false);

  const dispatch = useDispatch();

  const [deleteDocMutation] = useDeleteDocMutation();
  const [copyCutDoc] = useCopyCutDocMutation();

  const showManager = useMemo(
    () => ({
      createFile: setCreateFileShow,
      createGroup: setCreateGroupShow,
      modifyName: setModifyNameShow,
    }),
    [setCreateFileShow, setCreateGroupShow, setModifyNameShow],
  );

  // the click position is a file
  const clickOnFile = path.length === 0 ? false : norCurDoc.isFile;

  // show only one of the operations
  const showSelection = (key: keyof typeof showManager) => {
    Object.keys(showManager).forEach((item) => {
      if (item === key) showManager[item](true);
      else showManager[item as typeof key](false);
    });
  };

  // stop the menu propagating the click event
  const menuClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // for document.body only
    e.nativeEvent.stopImmediatePropagation();
  };

  /**
   * when click the copy, update the global copy path
   */
  const copyCutClick = (copyOrCut: 'COPY' | 'CUT') => {
    Toast('copying...', 'SUCCESS');
    // hidden the menu
    document.body.click();

    dispatch(
      updateCopyCut({
        copyPath: copyOrCut === 'COPY' ? norPath : '',
        cutPath: copyOrCut === 'CUT' ? norPath : '',
      }),
    );
  };

  const pasteClick = async () => {
    // hidden the menu
    document.body.click();
    // move the doc

    const copyCutPath = copyPath === '' ? cutPath : copyPath;
    const copyCutOnFile = norDocs[copyCutPath].doc.isFile;
    // file or dir
    const copyCutDocName = norDocs[copyCutPath].doc.name;

    // click on file or not
    const pastePath = norCurDoc
      ? norCurDoc.isFile
        ? normalizePath(path.slice(0, path.length - 1).concat(copyCutDocName))
        : normalizePath(path.concat(copyCutDocName))
      : copyCutDocName;

    // check if there is a repeat name
    if (norDocs[pastePath]) {
      Toast('name already exist in this folder!', 'WARNING', 3000);
      return;
    }

    try {
      await copyCutDoc({
        copyCutPath,
        pastePath: pastePath,
        isCopy: cutPath === '',
        isFile: copyCutOnFile,
      }).unwrap();

      copyCutHandler(copyCutPath, pastePath, copyPath === '', copyCutOnFile);

      Toast('updated!', 'SUCCESS');
    } catch {
      Toast('failed to copyCut...', 'ERROR');
    }

    // clear the previous copy and cut
    dispatch(
      updateCopyCut({
        copyPath: '',
        cutPath: '',
      }),
    );
  };

  const deleteDoc = async () => {
    try {
      await deleteDocMutation({
        path: norPath,
        isFile: clickOnFile,
      }).unwrap();
      // hidden the menu
      document.body.click();

      Toast('deleted!', 'WARNING');

      // handle router issue
      deleteHandler(norPath, clickOnFile);
    } catch {
      Toast('failed to delete...', 'ERROR');
    }
  };

  const hiddenAll = useCallback(() => {
    Object.keys(showManager).forEach((item) => {
      showManager[item as keyof typeof showManager](false);
    });
  }, [showManager]);

  useEffect(() => {
    // all hidden
    document.addEventListener('click', hiddenAll);

    return () => {
      document.removeEventListener('click', hiddenAll);
    };
  }, [hiddenAll]);

  useEffect(() => {
    // all hidden when click on other places
    hiddenAll();
    // eslint-disable-next-line
  }, [xPos, yPos]);

  // make show direction flexible to avoid overflow
  const menuPos =
    yPos + 300 >= document.body.clientHeight
      ? {
          left: xPos,
          bottom: document.body.clientHeight - yPos,
        }
      : {
          left: xPos,
          top: yPos,
        };

  return (
    <main className="operation-menu" onClick={menuClick} style={menuPos}>
      <section
        className="operations"
        onClick={() => {
          showSelection('createFile');
        }}
      >
        create new file
        {createFileShow && <CreateDoc isFile={true} clickOnFile={clickOnFile} path={path} />}
      </section>
      <section
        className="operations"
        onClick={() => {
          showSelection('createGroup');
        }}
      >
        create new group
        {createGroupShow && <CreateDoc isFile={false} clickOnFile={clickOnFile} path={path} />}
      </section>
      {/* hidden when click from the root menu */}
      <section
        className="operations"
        onClick={() => {
          copyCutClick('COPY');
        }}
        hidden={path.length === 0}
      >
        copy
      </section>
      {/* hidden when click from the root menu */}
      <section
        className="operations"
        onClick={() => {
          copyCutClick('CUT');
        }}
        hidden={path.length === 0}
      >
        cut
      </section>
      {/* hidden when no copying or cutting*/}
      <section className="operations" onClick={() => void pasteClick()} hidden={copyPath === '' && cutPath === ''}>
        paste
      </section>
      {/* hidden when click from the root menu */}
      <section
        className="operations"
        onClick={() => {
          showSelection('modifyName');
        }}
        hidden={path.length === 0}
      >
        rename
        {modifyNameShow && (
          <ModifyName
            isFile={clickOnFile}
            path={path}
            siblings={Array.isArray(curDocParent) ? curDocParent : curDocParent.children}
          />
        )}
      </section>
      {/* hidden when click from the root menu */}
      <section
        className="operations"
        onClick={() => {
          setDeleteConfirmShow(true);
        }}
        hidden={path.length === 0}
      >
        delete
        {deleteConfirmShow && (
          <Modal showControl={setDeleteConfirmShow} confirmCallback={() => void deleteDoc()}>
            {`Are you sure to delete the ${clickOnFile ? 'file' : 'group'}?`}
          </Modal>
        )}
      </section>
    </main>
  );
}

export default React.memo(
  OperationMenu,
  // true will stop rendering
  (prevProps, nextProps) => prevProps.xPos === nextProps.xPos && prevProps.yPos === nextProps.yPos,
);
