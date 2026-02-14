/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MilkdownProvider } from '@milkdown/react';
import Split from '@uiw/react-split';
import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';

import { DocMirror } from '../DocMirror/DocMirror';
import { DraftEditor } from '../Editor/DraftEditor';
import { MarkdownEditor } from '../Editor/Editor';
import { EditorRef } from '../Editor/type';
import Header from '../Header/Header';
import OpenTab from '../OpenTab/OpenTab';
import { OutlineContainer } from '../Outline/OutlineContainer';
import { SplitBar } from '../SplitBar';

import { GITHUB_PAGES_BASE_PATH } from '@/constants';
import { selectCurActiveTab, selectCurContent } from '@/redux-feature/curDocSlice';
import { selectGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { useShortCut } from '@/utils/hooks/tools';

import './EditorContainer.scss';

export const PurePage = () => {
  return <div className="pure-page">Just pick one!</div>;
};

const isDocPage = (path: string) => {
  return (
    path.startsWith(`${GITHUB_PAGES_BASE_PATH}article/`) ||
    path.startsWith(`${GITHUB_PAGES_BASE_PATH}draft/`) ||
    path.startsWith(`${GITHUB_PAGES_BASE_PATH}internal/`)
  );
};

export const EditorContainer = () => {
  useShortCut();

  const isDocPageFlag = isDocPage(location.pathname);

  const editorRef = useRef<EditorRef>(null);

  const curTab = useSelector(selectCurActiveTab);
  const { mirrorCollapse, isEditorBlur, outlineCollapse } = useSelector(selectGlobalOpts);
  const globalContent = useSelector(selectCurContent);

  const defaultPagePath = useMemo(() => {
    return curTab ? `/article/${curTab.ident}` : '/purePage';
  }, [curTab]);

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
          <div style={{ width: '40%', transition: 'none', flex: 1 }}>
            <Routes>
              <Route
                path="/article/:docPath"
                element={
                  <MilkdownProvider>
                    <MarkdownEditor ref={editorRef} />
                  </MilkdownProvider>
                }
              />
              <Route
                path="/draft/:docId"
                element={
                  <MilkdownProvider>
                    <DraftEditor ref={editorRef} type="draft" />
                  </MilkdownProvider>
                }
              />
              <Route
                path="/internal/:docId"
                element={
                  <MilkdownProvider>
                    <DraftEditor ref={editorRef} type="internal" />
                  </MilkdownProvider>
                }
              />
              <Route path="/purePage" element={<PurePage />} />
              <Route path="*" element={<Navigate to={defaultPagePath} />} />
            </Routes>
          </div>
          {!mirrorCollapse && (
            <div style={{ width: '40%', transition: 'none' }}>
              <DocMirror onChange={handleDocMirrorChange} />
            </div>
          )}
          {!outlineCollapse && isDocPageFlag && (
            <div style={{ width: '20%', minWidth: '15%', transition: 'none', height: '100%' }}>
              <OutlineContainer />
            </div>
          )}
        </Split>
      </main>
    </div>
  );
};
