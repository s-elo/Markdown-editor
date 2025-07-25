import { Tooltip } from 'primereact/tooltip';
import { FC, useContext, useMemo } from 'react';
import { TreeRef } from 'react-complex-tree';

import { useNewDocItem } from './operations';
import { TreeDataCtx } from './type';

import { useRefreshDocsMutation } from '@/redux-api/docs';
import Toast from '@/utils/Toast';

interface ShortcutProps {
  visible: boolean;
  tree: React.RefObject<TreeRef | null>;
}

export const Shortcut: FC<ShortcutProps> = ({ visible, tree }) => {
  const treeDataCtx = useContext(TreeDataCtx);

  const [refreshDoc] = useRefreshDocsMutation();
  const createNewDocItem = useNewDocItem();

  const hiddenStyle = useMemo<React.CSSProperties>(() => ({ visibility: visible ? 'visible' : 'hidden' }), [visible]);

  const onRefresh = async (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();

    try {
      await refreshDoc().unwrap();

      Toast('refreshed', 'SUCCESS');
    } catch (err) {
      Toast('failed to refresh...', 'ERROR');
    }
  };

  const createNewDoc = async (isFolder: boolean) => {
    if (!treeDataCtx) return;
    await createNewDocItem(treeDataCtx.data.root, isFolder);
  };

  return (
    <div
      className="shortcut-bar"
      onContextMenu={(e) => {
        e.stopPropagation();
      }}
    >
      <Tooltip className="tool-tip" target=".new-folder" content="New File" position="bottom" />
      <i className="pi pi-folder-plus new-folder" onClick={() => void createNewDoc(true)} style={hiddenStyle}></i>
      <Tooltip className="tool-tip" target=".new-file" content="New File" position="bottom" />
      <i className="pi pi-file-plus new-file" onClick={() => void createNewDoc(false)} style={hiddenStyle}></i>
      <Tooltip className="tool-tip" target=".collapse-all" content="Collapse All" position="bottom" />
      <i
        className="pi pi-minus-circle collapse-all"
        onClick={() => tree.current?.collapseAll()}
        style={hiddenStyle}
      ></i>
      <Tooltip className="tool-tip" target=".refresh" content="Refresh Menu" position="bottom" />
      <i className="pi pi-refresh refresh" onClick={(e) => void onRefresh(e)} style={hiddenStyle}></i>
    </div>
  );
};
