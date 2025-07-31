/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useDispatch, useSelector } from 'react-redux';

import DocSearch from '../DocSearch/DocSearch';

// import ImgSearch from '../ImgSearch/ImgSearch';
// import UploadImg from '../UploadImg/UploadImg';

import { Icon } from '@/components/Icon/Icon';
import { selectCurDoc } from '@/redux-feature/curDocSlice';
import { updateGlobalOpts, selectGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { useSaveDoc, useSwitchNarrowMode, useSwitchReadonlyMode, useSwitchTheme } from '@/utils/hooks/reduxHooks';

import './Header.scss';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function Header() {
  const { isDarkMode, readonly, mirrorCollapse, narrowMode } = useSelector(selectGlobalOpts);

  const { isDirty } = useSelector(selectCurDoc);

  const saveDoc = useSaveDoc();
  const switchReadonlyMode = useSwitchReadonlyMode();
  const switchTheme = useSwitchTheme();
  const switchNarrowMode = useSwitchNarrowMode();

  const dispatch = useDispatch();

  return (
    <div className="header-container">
      <div className="btn-group">
        <DocSearch />
        {/* <UploadImg />
        <ImgSearch></ImgSearch> */}
      </div>
      <div className="btn-group">
        <Icon
          id="code-mirror-toggle"
          iconName={mirrorCollapse ? 'map' : 'book'}
          size="20px"
          toolTipContent={mirrorCollapse ? 'show code mirror' : 'hide code mirror'}
          onClick={() => {
            dispatch(
              updateGlobalOpts({
                keys: ['mirrorCollapse'],
                values: [!mirrorCollapse],
              }),
            );
          }}
        />
        <Icon
          id="save-doc"
          iconName="save"
          size="20px"
          // eslint-disable-next-line @typescript-eslint/no-magic-numbers
          style={{ opacity: isDirty ? 1 : 0.5 }}
          toolTipContent="Save Current Document"
          onClick={() => void saveDoc()}
        />
        <Icon
          id="full-narrow-toggle"
          iconName={narrowMode ? 'expand' : 'arrow-down-left-and-arrow-up-right-to-center'}
          size="20px"
          toolTipContent={narrowMode ? 'Full Mode' : 'Narrow Mode'}
          onClick={switchNarrowMode}
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
