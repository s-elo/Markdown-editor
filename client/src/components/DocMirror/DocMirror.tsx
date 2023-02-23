import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import CodeMirror from '@uiw/react-codemirror';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { EditorWrappedRef } from '../EditorContainer/EditorContainer';

import { selectCurContent, selectCurPath } from '@/redux-feature/curDocSlice';
import { selectGlobalOpts } from '@/redux-feature/globalOptsSlice';
import ErrorBoundary from '@/utils/ErrorBoundary/ErrorBoundary';

import './DocMirror.less';

export interface DocMirrorProps {
  unmount: boolean;
  editorRef: React.RefObject<EditorWrappedRef>;
}

const MirrorWrapper = ({ editorRef }: { editorRef: React.RefObject<EditorWrappedRef> }) => {
  const { isDarkMode, isEditorBlur } = useSelector(selectGlobalOpts);
  const globalContent = useSelector(selectCurContent);
  const contentPath = useSelector(selectCurPath);

  const [mirrorVal, setMirrorVal] = useState('');

  useEffect(() => {
    // only when editing the editor, sync the code at mirror
    if (!isEditorBlur) setMirrorVal(globalContent);
    // eslint-disable-next-line
  }, [globalContent]);

  useEffect(() => {
    // set the new value for mirror when switch to new doc
    setMirrorVal(globalContent);
    // eslint-disable-next-line
  }, [contentPath]);

  return (
    <ErrorBoundary displayInfo="code mirror somehow can not parse the current doc...">
      <CodeMirror
        value={mirrorVal}
        theme={isDarkMode ? 'dark' : 'light'}
        extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
        onChange={(value) => {
          if (isEditorBlur && editorRef.current && value !== globalContent) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            editorRef.current.update(value);
          }
        }}
      />
    </ErrorBoundary>
  );
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function DocMirror({ unmount, editorRef }: DocMirrorProps) {
  return (
    <div className="code-mirror-container">
      {/* doesn't need to render when it is at the backend */}
      {!unmount && <MirrorWrapper editorRef={editorRef} />}
    </div>
  );
}
