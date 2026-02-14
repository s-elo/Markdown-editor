/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';
import { useRef } from 'react';
import { useSelector } from 'react-redux';

import DocSearch from '../DocSearch/DocSearch';

// import ImgSearch from '../ImgSearch/ImgSearch';
// import UploadImg from '../UploadImg/UploadImg';

import { Icon } from '@/components/Icon/Icon';
import { selectCurDoc } from '@/redux-feature/curDocSlice';
import { selectGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { useSaveDoc, useSwitchReadonlyMode, useSwitchTheme } from '@/utils/hooks/reduxHooks';
import { nextTick } from '@/utils/utils';

import './Header.scss';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function Header() {
  const { readonly, theme } = useSelector(selectGlobalOpts);
  const { isDirty, type, contentIdent } = useSelector(selectCurDoc);

  const themeMenuRef = useRef<Menu>(null);

  const saveDoc = useSaveDoc();
  const switchReadonlyMode = useSwitchReadonlyMode();
  const switchTheme = useSwitchTheme();

  const themeMenuItems: MenuItem[] = [
    {
      label: 'Themes',
      items: [
        {
          label: 'Light',
          icon: 'pi pi-sun',
          className: theme === 'light' ? 'p-highlight' : '',
          command: () => {
            // avoid instant re-render to make the toggle abnormal
            nextTick(() => switchTheme('light'));
          },
        },
        {
          label: 'Soft',
          icon: 'pi pi-face-smile',
          className: theme === 'soft' ? 'p-highlight' : '',
          command: () => {
            nextTick(() => switchTheme('soft'));
          },
        },
        {
          label: 'Dark',
          icon: 'pi pi-moon',
          className: theme === 'dark' ? 'p-highlight' : '',
          command: () => {
            nextTick(() => switchTheme('dark'));
          },
        },
      ],
    },
  ];

  return (
    <div className="header-container">
      <div className="btn-group">
        <DocSearch />
      </div>
      <div className="btn-group">
        <Icon
          id="save-doc"
          iconName="save"
          size="20px"
          disabled={!isDirty || type === 'internal' || contentIdent === ''}
          toolTipContent="Save"
          onClick={() => void saveDoc()}
        />
        <Icon
          id="read-edit-toggle"
          iconName={readonly ? 'pen-to-square' : 'eye'}
          size="20px"
          disabled={type === 'internal' || contentIdent === ''}
          toolTipContent={readonly ? 'Edit' : 'Readonly'}
          onClick={switchReadonlyMode}
        />
        <Icon
          id="theme-toggle"
          iconName="palette"
          size="20px"
          toolTipContent="Themes"
          onClick={(e) => {
            themeMenuRef.current?.toggle(e);
          }}
        />
        <Menu ref={themeMenuRef} popup model={themeMenuItems} />
      </div>
    </div>
  );
}
