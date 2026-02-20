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
import { selectMenuCollapse } from './redux-feature/globalOptsSlice';
import { useCheckServer } from './utils/hooks/reduxHooks';

import './App.scss';

export const App: FC = () => {
  const { isLoading, isError, isSuccess } = useCheckServer();
  const menuCollapse = useSelector(selectMenuCollapse);
  const navigate = useNavigate();

  const showMenu = !isError && !menuCollapse;

  useEffect(() => {
    if (isError) {
      void navigate('/internal/guide');
    }
  }, [isError, isSuccess]);

  if (isLoading) {
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
          {/* re-rendering menu to select current doc */}
          {showMenu && (
            <div
              style={{
                width: !showMenu ? 0 : '15%',
                minWidth: '10%',
                visibility: !showMenu ? 'hidden' : 'visible',
                transition: 'none',
              }}
            >
              <Menu />
            </div>
          )}
          <div style={{ flex: 1, width: !showMenu ? '100%' : '85%', transition: 'none' }}>
            <EditorContainer />
          </div>
        </Split>
      </div>
      <Footer />
    </PrimeReactProvider>
  );
};
