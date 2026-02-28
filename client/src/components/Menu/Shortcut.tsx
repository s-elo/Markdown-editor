import { FC, useContext, useMemo } from 'react';
import { TreeRef } from 'react-complex-tree';

import { useNewDocItem } from './operations';
import { TreeDataCtx } from './type';

import { Icon } from '@/components/Icon/Icon';

interface ShortcutProps {
  visible: boolean;
  tree: React.RefObject<TreeRef | null>;
}

export const Shortcut: FC<ShortcutProps> = ({ visible, tree }) => {
  const treeDataCtx = useContext(TreeDataCtx);

  const createNewDocItem = useNewDocItem();

  const hiddenStyle = useMemo<React.CSSProperties>(() => ({ visibility: visible ? 'visible' : 'hidden' }), [visible]);

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
      <Icon
        id="new-folder"
        iconName="folder-plus"
        onClick={() => void createNewDoc(true)}
        style={hiddenStyle}
        toolTipContent="New Folder"
      />
      <Icon
        id="new-file"
        iconName="file-plus"
        onClick={() => void createNewDoc(false)}
        style={hiddenStyle}
        toolTipContent="New File"
      />
      <Icon
        id="collapse-all"
        iconName="minus-circle"
        onClick={() => tree.current?.collapseAll()}
        style={hiddenStyle}
        toolTipContent="Collapse All"
      />
    </div>
  );
};
