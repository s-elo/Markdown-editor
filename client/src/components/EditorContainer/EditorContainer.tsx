/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MilkdownProvider } from '@milkdown/react';
import { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';

import ResizableBox from '../../utils/ResizableBox/ResizableBox';
import { DocMirror } from '../DocMirror/DocMirror';
import { MarkdownEditor } from '../Editor/Editor';
import Header from '../Header/Header';
import OpenTab from '../OpenTab/OpenTab';
import SidePanel from '../SidePanel/SidePanel';

import { selectCurActiveTab, selectCurContent } from '@/redux-feature/curDocSlice';
import { selectGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { smoothCollapse } from '@/utils/utils';

import './EditorContainer.scss';

export interface EditorWrappedRef {
  update: (newContent: string) => void;
}

export const PurePage = () => {
  return <div className="pure-page">Just pick one!</div>;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function EditorContainer() {
  const editorRef = useRef<EditorWrappedRef>(null);

  const curTab = useSelector(selectCurActiveTab);
  const { mirrorCollapse, isEditorBlur } = useSelector(selectGlobalOpts);
  const globalContent = useSelector(selectCurContent);

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

  const handleDocMirrorChange = (value: string) => {
    if (isEditorBlur && editorRef.current && value !== globalContent) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      editorRef.current.update(value);
    }
  };

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
            <Route
              path="/article/:contentPath"
              element={
                <MilkdownProvider>
                  <MarkdownEditor ref={editorRef as React.RefObject<EditorWrappedRef>} />
                </MilkdownProvider>
              }
            />
            <Route path="/purePage" element={<PurePage />} />
            <Route path="*" element={<Navigate to={curTab ? `/article/${curTab.path as string}` : '/purePage'} />} />
          </Routes>
          {!unmountMirror && <DocMirror onChange={handleDocMirrorChange} />}
        </ResizableBox>
      </main>
      <SidePanel />
    </div>
  );
}
