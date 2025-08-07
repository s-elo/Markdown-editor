/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MilkdownProvider } from '@milkdown/react';
import Split from '@uiw/react-split';
import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';

import { DocMirror } from '../DocMirror/DocMirror';
import { MarkdownEditor } from '../Editor/Editor';
import Header from '../Header/Header';
import OpenTab from '../OpenTab/OpenTab';
import { OutlineContainer } from '../Outline/OutlineContainer';
import { SplitBar } from '../SplitBar';

import { selectCurActiveTab, selectCurContent } from '@/redux-feature/curDocSlice';
import { selectGlobalOpts } from '@/redux-feature/globalOptsSlice';

import './EditorContainer.scss';

export interface EditorWrappedRef {
  update: (newContent: string) => void;
}

export const PurePage = () => {
  return <div className="pure-page">Just pick one!</div>;
};

export const EditorContainer = () => {
  const editorRef = useRef<EditorWrappedRef>(null);

  const curTab = useSelector(selectCurActiveTab);
  const { mirrorCollapse, isEditorBlur, outlineCollapse } = useSelector(selectGlobalOpts);
  const globalContent = useSelector(selectCurContent);

  const { outlineWidth, mirrorWidth, editorWidth } = useMemo(() => {
    const ret = {
      outlineWidth: 30,
      mirrorWidth: 30,
      editorWidth: 30,
    };

    if (outlineCollapse) {
      ret.editorWidth = ret.editorWidth + ret.outlineWidth / 2;
      ret.mirrorWidth = ret.mirrorWidth + ret.outlineWidth / 2;
      ret.outlineWidth = 0;
    }
    if (mirrorCollapse) {
      ret.editorWidth = ret.editorWidth + ret.mirrorWidth;
      ret.mirrorWidth = 0;
    }

    return ret;
  }, [outlineCollapse, mirrorCollapse]);

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
        <Split
          mode="horizontal"
          renderBar={SplitBar}
          disable={mirrorCollapse && outlineCollapse}
          visible={!mirrorCollapse || !outlineCollapse}
        >
          <div style={{ width: `${editorWidth}%`, transition: 'none', flex: 1 }}>
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
          </div>
          {!mirrorCollapse && (
            <div style={{ width: `${mirrorWidth}%`, transition: 'none' }}>
              <DocMirror onChange={handleDocMirrorChange} />
            </div>
          )}
          {!outlineCollapse && (
            <div style={{ width: `${outlineWidth}%`, transition: 'none' }}>
              <OutlineContainer />
            </div>
          )}
        </Split>
      </main>
    </div>
  );
};
