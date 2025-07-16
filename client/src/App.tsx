import Split from '@uiw/react-split';
import { PrimeReactProvider } from 'primereact/api';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { useSelector } from 'react-redux';

import { EditorContainer } from './components/EditorContainer/EditorContainer';
import { Menu } from './components/Menu';
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
      <Split renderBar={SplitBar} mode="horizontal" className="container" id="container" visible={!menuCollapse}>
        <div
          style={{
            width: menuCollapse ? 0 : '15%',
            visibility: menuCollapse ? 'hidden' : 'visible',
            transition: 'none',
          }}
        >
          <Menu />
        </div>
        <div style={{ flex: 1, width: menuCollapse ? '100%' : '85%', transition: 'none' }}>
          <EditorContainer />
        </div>
      </Split>
    </PrimeReactProvider>
  );
};
