import { InputText } from 'primereact/inputtext';
import { FC, useState } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { useCreateFolderMutation } from '@/redux-api/docs';
import Toast from '@/utils/Toast';
import { confirm } from '@/utils/utils';

import './NewFolder.scss';

export interface NewFolderProps {
  onConfirm?: (folderPath: string) => Promise<void> | void;
  onCreated?: (folderPath: string) => Promise<void> | void;
  underFolder: string;
}

export const NewFolder: FC<NewFolderProps> = ({ onConfirm, underFolder, onCreated }) => {
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const [createFolder] = useCreateFolderMutation();

  const handleConfirmClick = async () => {
    if (
      !(await confirm({
        message: `Are you sure to create folder "${inputValue}" under "${underFolder}"?`,
      }))
    ) {
      return;
    }

    try {
      const createFolderPath = `${underFolder}${underFolder.endsWith('/') ? '' : '/'}${inputValue}`;
      if (onConfirm) {
        await onConfirm(createFolderPath);
        return;
      }

      await createFolder({ folderPath: createFolderPath }).unwrap();

      await onCreated?.(createFolderPath);
      Toast('created successfully!', 'SUCCESS');
      setShowInput(false);
      setInputValue('');
    } catch (e) {
      Toast((e as Error).message, 'ERROR');
    }
  };

  return (
    <div className="new-folder-container">
      <div className={`input-container${showInput ? ' show' : ''}`}>
        <InputText
          className="new-folder-input"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
          placeholder="New folder name"
        />
        <Icon
          iconName="check"
          id="workspace-new-folder-input-confirm"
          className="input-confirm"
          onClick={() => {
            void handleConfirmClick();
          }}
        />
        <Icon
          iconName="times"
          id="workspace-new-folder-input-cancel"
          className="input-cancel"
          onClick={() => {
            setShowInput(false);
            setInputValue('');
          }}
        />
      </div>
      <Icon
        id="workspace-new-folder"
        iconName="folder-plus"
        className={`new-folder-icon${showInput ? ' hidden' : ''}`}
        onClick={() => {
          setShowInput(true);
        }}
        toolTipContent="New Folder"
      />
    </div>
  );
};
