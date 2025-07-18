import { Tooltip } from 'primereact/tooltip';
import { FC, useMemo } from 'react';
import { TreeRef } from 'react-complex-tree';

import { useRefreshDocsMutation } from '@/redux-api/docs';
import Toast from '@/utils/Toast';

interface ShortcutProps {
  visible: boolean;
  tree: React.RefObject<TreeRef | null>;
}

export const Shortcut: FC<ShortcutProps> = ({ visible, tree }) => {
  const [refreshDoc] = useRefreshDocsMutation();

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

  return (
    <div
      className="shortcut-bar"
      onContextMenu={(e) => {
        e.stopPropagation();
      }}
    >
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
