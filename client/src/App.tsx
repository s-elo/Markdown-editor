import EditorContainer from './components/EditorContainer/EditorContainer';
import Menu from './components/Menu/MenuContainer';
import { useShortCut } from './utils/hooks/tools';

import './App.less';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function App() {
  useShortCut();

  return (
    <div className="container" id="container">
      <Menu />
      <EditorContainer />
    </div>
  );
}
