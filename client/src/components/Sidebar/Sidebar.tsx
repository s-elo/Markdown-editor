import GitFlow from '@mui/icons-material/CommitOutlined';
import MenuClose from '@mui/icons-material/MenuOpenOutlined';
import MenuOpen from '@mui/icons-material/MenuOutlined';
import SettingIcon from '@mui/icons-material/SettingsOutlined';
import { OverlayPanel } from 'primereact/overlaypanel';
import { FC, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import ConfigBox from '@/components/ConfigBox/ConfigBox';
import GitBox from '@/components/GitBox/GitBox';
import { Icon } from '@/components/Icon/Icon';
import { updateGlobalOpts, selectGlobalOpts } from '@/redux-feature/globalOptsSlice';
import ErrorBoundary from '@/utils/ErrorBoundary/ErrorBoundary';

import './Sidebar.scss';

export const Sidebar: FC = () => {
  const [configShow, setConfigShow] = useState(false);

  const { menuCollapse } = useSelector(selectGlobalOpts);
  const dispatch = useDispatch();

  const gitOverlayPanelRef = useRef<OverlayPanel>(null);

  const onClickGit = (event: React.MouseEvent) => {
    gitOverlayPanelRef.current?.toggle(event);
  };

  return (
    <div className="sidebar-container">
      <Icon
        id="menu-toggle"
        size="22px"
        icon={menuCollapse ? MenuOpen : MenuClose}
        toolTipContent={menuCollapse ? 'show menu' : 'hide menu'}
        toolTipPosition="right"
        onClick={() => {
          dispatch(
            updateGlobalOpts({
              keys: ['menuCollapse'],
              values: [!menuCollapse],
            }),
          );
        }}
      />
      <Icon
        id="git-box"
        size="22px"
        icon={GitFlow}
        toolTipContent="Git Flow"
        toolTipPosition="right"
        onClick={onClickGit}
      />
      <OverlayPanel ref={gitOverlayPanelRef} className="sidebar-overlay">
        <ErrorBoundary>
          <GitBox />
        </ErrorBoundary>
      </OverlayPanel>
      <Icon
        id="settings"
        size="22px"
        icon={SettingIcon}
        toolTipContent="Settings"
        toolTipPosition="right"
        onClick={() => {
          setConfigShow(true);
        }}
      />
      {configShow && (
        <ErrorBoundary>
          <ConfigBox setShow={setConfigShow} />
        </ErrorBoundary>
      )}
    </div>
  );
};
