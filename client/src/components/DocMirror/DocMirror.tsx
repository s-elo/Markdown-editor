import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import CodeMirror from '@uiw/react-codemirror';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { selectCurContent, selectCurPath } from '@/redux-feature/curDocSlice';
import { selectGlobalOpts } from '@/redux-feature/globalOptsSlice';
import ErrorBoundary from '@/utils/ErrorBoundary/ErrorBoundary';

import './DocMirror.scss';

export interface DocMirrorProps {
  onChange: (value: string) => void;
}

export const DocMirror: React.FC<DocMirrorProps> = ({ onChange }) => {
  const { isDarkMode, isEditorBlur, readonly } = useSelector(selectGlobalOpts);
  const globalContent = useSelector(selectCurContent);
  const contentPath = useSelector(selectCurPath);

  const [mirrorVal, setMirrorVal] = useState('');

  useEffect(() => {
    // set the new value for mirror when switch to new doc
    setMirrorVal(globalContent);
    // eslint-disable-next-line
  }, [contentPath]);

  useEffect(() => {
    // only when editing the editor, sync the code at mirror
    if (!isEditorBlur) {
      setMirrorVal(globalContent);
    }
    // eslint-disable-next-line
  }, [globalContent]);

  return (
    <ErrorBoundary displayInfo="code mirror somehow can not parse the current doc...">
      <div className="code-mirror-container">
        <CodeMirror
          editable={!readonly}
          value={mirrorVal}
          theme={isDarkMode ? 'dark' : 'light'}
          extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
          onChange={onChange}
        />
      </div>
    </ErrorBoundary>
  );
};
