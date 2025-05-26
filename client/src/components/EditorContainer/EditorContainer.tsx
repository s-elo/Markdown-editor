/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';

import ResizableBox from '../../utils/ResizableBox/ResizableBox';
import DocMirror from '../DocMirror/DocMirror';
import MarkdownEditor from '../Editor/Editor';
import Header from '../Header/Header';
import OpenTab from '../OpenTab/OpenTab';
import SidePanel from '../SidePanel/SidePanel';

import { selectCurActiveTab } from '@/redux-feature/curDocSlice';
import { selectGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { smoothCollapse } from '@/utils/utils';

import './EditorContainer.less';

export interface EditorWrappedRef {
  update: (newContent: string) => void;
}

export const PurePage = () => {
  return <div className="pure-page">Just pick one!</div>;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function EditorContainer() {
  const curTab = useSelector(selectCurActiveTab);

  const editorRef = useRef<EditorWrappedRef>(null);

  const { mirrorCollapse } = useSelector(selectGlobalOpts);

  // just for hidden and show UI experience
  const [unmountMirror, setUnmountMirror] = useState(true);
  const [hideResizeBar, setHideResizeBar] = useState(false);

  const editorEffect = smoothCollapse(mirrorCollapse);
  const mirrorEffect = smoothCollapse(
    mirrorCollapse,
    // wait for the collapsing finishing then unmount the mirror and hide the bar
    () => {
      setUnmountMirror(true);
      setHideResizeBar(true);
    },
    // when to open the box, open the mirror and show the bar immediately
    () => {
      setUnmountMirror(false);
      setHideResizeBar(false);
    },
  );

  return (
    <div className="editor-container">
      <Header />
      <OpenTab />
      <main className="doc-area">
        <ResizableBox
          // eslint-disable-next-line @typescript-eslint/no-magic-numbers
          defaultWidth={[0.5, 0.5]}
          effects={[editorEffect, mirrorEffect]}
          effectsDeps={[mirrorCollapse]}
          boxStyles={[mirrorCollapse ? { width: '100%' } : {}, mirrorCollapse ? { width: '0%' } : {}]}
          resizeBarStyle={hideResizeBar ? { display: 'none' } : {}}
        >
          <Routes>
            <Route path="/article/:contentPath" element={<MarkdownEditor ref={editorRef} />} />
            <Route path="/purePage" element={<PurePage />} />
            <Route path="*" element={<Navigate to={curTab ? `/article/${curTab.path as string}` : '/purePage'} />} />
          </Routes>
          <DocMirror editorRef={editorRef} unmount={unmountMirror} />
        </ResizableBox>
      </main>
      <SidePanel />
    </div>
  );
}
