import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { FC, useState } from 'react';

interface CommitMsgBoxProps {
  disabled?: boolean;
  onCommitMsgTitleChange: (commitMsgTitle: string) => void;
  onCommitMsgBodyChange: (commitMsgBody: string) => void;
}

export const CommitMsgBox: FC<CommitMsgBoxProps> = ({ disabled, onCommitMsgTitleChange, onCommitMsgBodyChange }) => {
  const [commitMsgTitle, setCommitMsgTitle] = useState('');
  const [commitMsgBody, setCommitMsgBody] = useState('');

  return (
    <div className="commit-msg-box">
      <div>Title</div>
      <InputText
        type="text"
        value={commitMsgTitle}
        disabled={disabled}
        onChange={(event) => {
          setCommitMsgTitle(event.target.value);
          onCommitMsgTitleChange(event.target.value);
        }}
        className="commit-msg-input"
        placeholder="commit message title"
      />
      <div>Body</div>
      <InputTextarea
        value={commitMsgBody}
        disabled={disabled}
        onChange={(event) => {
          setCommitMsgBody(event.target.value);
          onCommitMsgBodyChange(event.target.value);
        }}
        className="commit-msg-input"
        placeholder="commit message body"
      />
    </div>
  );
};
