/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';
import { useRef } from 'react';
import { useSelector } from 'react-redux';

import { DocSearch } from '../DocSearch/DocSearch';
import { ImgManagement } from '../ImgManagement/ImgManagement';

import { Icon } from '@/components/Icon/Icon';
import { selectCurDoc } from '@/redux-feature/curDocSlice';
import { selectGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { useGitHubLogin } from '@/utils/hooks/githubAuthHooks';
import { useSaveDoc, useSwitchReadonlyMode, useSwitchTheme } from '@/utils/hooks/reduxHooks';
import { nextTick } from '@/utils/utils';

import './Header.scss';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function Header() {
  const { readonly, theme } = useSelector(selectGlobalOpts);
  const { isDirty, type, contentIdent } = useSelector(selectCurDoc);

  const themeMenuRef = useRef<Menu>(null);
  const { githubLogin, githubAvatarUrl, isGitHubLoginLoading, startGitHubLogin } = useGitHubLogin();

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
        {
          label: 'Cyber',
          icon: 'pi pi-box',
          className: theme === 'cyber' ? 'p-highlight' : '',
          command: () => {
            nextTick(() => switchTheme('cyber'));
          },
        },
      ],
    },
  ];

  return (
    <div className="header-container">
      <div className="btn-group">
        <DocSearch />
        <ImgManagement />
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
        {githubLogin && githubAvatarUrl ? (
          <a
            className="github-avatar-link"
            href={`https://github.com/${githubLogin}`}
            target="_blank"
            rel="noreferrer"
            title={`Open ${githubLogin}'s GitHub`}
          >
            <img className="github-avatar" src={githubAvatarUrl} alt={`${githubLogin}'s GitHub avatar`} />
          </a>
        ) : (
          <Icon
            id="github-login"
            iconName="github"
            size="20px"
            disabled={isGitHubLoginLoading}
            toolTipContent={isGitHubLoginLoading ? 'Signing in to GitHub…' : 'Sign in with GitHub'}
            onClick={startGitHubLogin}
          />
        )}
        <Menu ref={themeMenuRef} popup model={themeMenuItems} />
      </div>
    </div>
  );
}
