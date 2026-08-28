import Split from '@uiw/react-split';
import { PrimeReactProvider } from 'primereact/api';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { FC, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { EditorContainer } from './components/EditorContainer/EditorContainer';
import { Footer } from './components/Footer/Footer';
import { Menu } from './components/Menu/Menu';
import { Sidebar } from './components/Sidebar/Sidebar';
import { SplitBar } from './components/SplitBar';
import { APP_VERSION } from './constants';
import { selectWorkspaceMode } from './redux-feature/githubWorkspaceSlice';
import { selectMenuCollapse } from './redux-feature/globalOptsSlice';
import { useGitHubInstallationGuard } from './utils/hooks/githubInstallationHooks';
import { useCheckServer, useWarnUnsavedOnUnload } from './utils/hooks/reduxHooks';
import { useGitHubWorkspaceSync } from './utils/hooks/workspaceHooks';

import './App.scss';

export const App: FC = () => {
  useWarnUnsavedOnUnload();

  const workspaceMode = useSelector(selectWorkspaceMode);
  useGitHubInstallationGuard();
  useGitHubWorkspaceSync();
  const { isLoading, isError, isSuccess, data: serverCheckRes } = useCheckServer(workspaceMode === 'local');
  const menuCollapse = useSelector(selectMenuCollapse);
  const navigate = useNavigate();

  const showMenu = (workspaceMode === 'github' || !isError) && !menuCollapse;

  useEffect(() => {
    if (workspaceMode === 'local' && isError) {
      void navigate('/internal/guide');
      return;
    }

    if (workspaceMode === 'local' && !isLoading && serverCheckRes?.version !== APP_VERSION) {
      void navigate('/internal/version-mismatch');
    }
  }, [isError, isSuccess, serverCheckRes, workspaceMode]);

  if (workspaceMode === 'local' && isLoading) {
    return (
      <div className="app-loading-container">
        <i className="pi pi-spinner pi-spin" />
      </div>
    );
  }

  return (
    <PrimeReactProvider>
      <ConfirmDialog />
      <div className="app-container">
        <Sidebar />
        <Split renderBar={SplitBar} mode="horizontal" className="container" id="container" visible={showMenu}>
          <div
            style={{
              width: showMenu ? '15%' : 0,
              minWidth: showMenu ? '10%' : 0,
              visibility: showMenu ? 'visible' : 'hidden',
              transition: 'none',
            }}
          >
            <Menu />
          </div>
          <div style={{ flex: 1, width: showMenu ? '85%' : '100%', transition: 'none' }}>
            <EditorContainer />
          </div>
        </Split>
      </div>
      <Footer />
    </PrimeReactProvider>
  );
};
