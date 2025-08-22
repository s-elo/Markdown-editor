/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useSelector } from 'react-redux';

import DocSearch from '../DocSearch/DocSearch';

// import ImgSearch from '../ImgSearch/ImgSearch';
// import UploadImg from '../UploadImg/UploadImg';

import { Icon } from '@/components/Icon/Icon';
import { selectCurDoc } from '@/redux-feature/curDocSlice';
import { selectGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { useSaveDoc, useSwitchReadonlyMode, useSwitchTheme } from '@/utils/hooks/reduxHooks';

import './Header.scss';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function Header() {
  const { isDarkMode, readonly } = useSelector(selectGlobalOpts);

  const { isDirty } = useSelector(selectCurDoc);

  const saveDoc = useSaveDoc();
  const switchReadonlyMode = useSwitchReadonlyMode();
  const switchTheme = useSwitchTheme();

  return (
    <div className="header-container">
      <div className="btn-group">
        <DocSearch />
        {/* <UploadImg />
        <ImgSearch></ImgSearch> */}
      </div>
      <div className="btn-group">
        <Icon
          id="save-doc"
          iconName="save"
          size="20px"
          // eslint-disable-next-line @typescript-eslint/no-magic-numbers
          style={{ opacity: isDirty ? 1 : 0.5 }}
          toolTipContent="Save"
          onClick={() => void saveDoc()}
        />
        <Icon
          id="read-edit-toggle"
          iconName={readonly ? 'pen-to-square' : 'eye'}
          size="20px"
          toolTipContent={readonly ? 'Edit' : 'Readonly'}
          onClick={switchReadonlyMode}
        />
        <Icon
          id="theme-toggle"
          iconName={isDarkMode ? 'sun' : 'moon'}
          size="20px"
          toolTipContent={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          onClick={switchTheme}
        />
      </div>
    </div>
  );
}
