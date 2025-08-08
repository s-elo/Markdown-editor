import Split from '@uiw/react-split';
import { PrimeReactProvider } from 'primereact/api';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { useSelector } from 'react-redux';

import { EditorContainer } from './components/EditorContainer/EditorContainer';
import { Footer } from './components/Footer/Footer';
import { Menu } from './components/Menu/Menu';
import { Sidebar } from './components/Sidebar/Sidebar';
import { SplitBar } from './components/SplitBar';
import { selectMenuCollapse } from './redux-feature/globalOptsSlice';
import { useShortCut } from './utils/hooks/tools';

import './App.scss';

export const App = () => {
  useShortCut();
  const menuCollapse = useSelector(selectMenuCollapse);

  return (
    <PrimeReactProvider>
      <ConfirmDialog />
      <div className="app-container">
        <Sidebar />
        <Split renderBar={SplitBar} mode="horizontal" className="container" id="container" visible={!menuCollapse}>
          {/* re-rendering menu to select current doc */}
          {!menuCollapse && (
            <div
              style={{
                width: menuCollapse ? 0 : '15%',
                minWidth: '10%',
                visibility: menuCollapse ? 'hidden' : 'visible',
                transition: 'none',
              }}
            >
              <Menu />
            </div>
          )}
          <div style={{ flex: 1, width: menuCollapse ? '100%' : '85%', transition: 'none' }}>
            <EditorContainer />
          </div>
        </Split>
      </div>
      <Footer />
    </PrimeReactProvider>
  );
};
