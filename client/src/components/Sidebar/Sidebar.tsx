import GitFlow from '@mui/icons-material/CommitOutlined';
import MenuClose from '@mui/icons-material/MenuOpenOutlined';
import MenuOpen from '@mui/icons-material/MenuOutlined';
import SettingIcon from '@mui/icons-material/SettingsOutlined';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { OverlayPanel } from 'primereact/overlaypanel';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import GitBox from '@/components/GitBox/GitBox';
import { Icon } from '@/components/Icon/Icon';
import { SettingsBox } from '@/components/Settings/Settings';
import { Settings, useGetSettingsQuery, useUpdateSettingsMutation } from '@/redux-api/settings';
import { updateTabs } from '@/redux-feature/curDocSlice';
import { updateGlobalOpts, selectGlobalOpts } from '@/redux-feature/globalOptsSlice';
import ErrorBoundary from '@/utils/ErrorBoundary/ErrorBoundary';
import Toast from '@/utils/Toast';
import { isEqual } from '@/utils/utils';

import './Sidebar.scss';

export const Sidebar: FC = () => {
  const [settingsShow, setSettingsShow] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [newSettings, setNewSettings] = useState<Settings>({});

  const { data: settings } = useGetSettingsQuery();
  const [updateSettings] = useUpdateSettingsMutation();

  const { menuCollapse } = useSelector(selectGlobalOpts);
  const dispatch = useDispatch();

  const navigate = useNavigate();

  const gitOverlayPanelRef = useRef<OverlayPanel>(null);

  const isSettingsChanged = useMemo(() => {
    return !isEqual(newSettings, settings ?? {});
  }, [newSettings, settings]);

  useEffect(() => {
    setNewSettings(settings ?? {});
  }, [settings]);

  const onClickGit = (event: React.MouseEvent) => {
    gitOverlayPanelRef.current?.toggle(event);
  };

  const handleConfirmSettings = async () => {
    try {
      setSettingsLoading(true);

      const isRootPathChanged = newSettings.docRootPath !== settings?.docRootPath;

      await updateSettings(newSettings).unwrap();

      Toast('Settings updated successfully');
      setSettingsShow(false);

      if (isRootPathChanged) {
        await navigate('/purePage');
        dispatch(updateTabs([]));
      }
    } catch (e) {
      Toast.error((e as Error).message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const onHideSettings = () => {
    setSettingsShow(false);
    setNewSettings(settings ?? {});
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
          setSettingsShow(true);
        }}
      />
      <Dialog
        header={<div className="modal-title">⚙️ Settings</div>}
        footer={
          <div className="modal-footer">
            <Button label="Cancel" size="small" onClick={onHideSettings} />
            <Button
              loading={settingsLoading}
              label="Confirm"
              size="small"
              disabled={!isSettingsChanged || !newSettings?.docRootPath}
              onClick={() => {
                void handleConfirmSettings();
              }}
            />
          </div>
        }
        visible={settingsShow}
        onHide={onHideSettings}
      >
        <SettingsBox settings={settings ?? {}} onUpdateSettings={setNewSettings} />
      </Dialog>
    </div>
  );
};
