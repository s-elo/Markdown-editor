import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import type { RootState } from '@/store';

import { Icon } from '@/components/Icon/Icon';
import { useGetSettingsQuery } from '@/redux-api/settings';
import { selectCurTabs } from '@/redux-feature/curDocSlice';
import { useDeleteTab } from '@/utils/hooks/reduxHooks';
import { denormalizePath, getDraftKey } from '@/utils/utils';

import './OpenTab.scss';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function OpenTab() {
  const curTabs = useSelector(selectCurTabs);
  const { data: settings } = useGetSettingsQuery();
  const draftKeys = useSelector((state: RootState) => Object.keys(state.drafts));

  const navigate = useNavigate();

  const deleteTab = useDeleteTab();

  return (
    <div className="open-tab-container">
      {curTabs.map(({ ident, active, type, title }) => {
        const draftKey = getDraftKey(settings?.docRootPath, ident);
        const isDirty = draftKeys.includes(draftKey);

        const TabTitle = type === 'workspace' ? denormalizePath(ident).join('/') : title ?? ident;

        const tabName = type === 'workspace' ? denormalizePath(ident).slice(-1)[0] : title ?? ident;

        const toDoc = () => {
          if (type === 'workspace') {
            void navigate(`/article/${ident}`);
          } else if (type === 'draft') {
            void navigate(`/draft/${ident}`);
          } else if (type === 'internal') {
            void navigate(`/internal/${ident}`);
          }
        };

        return (
          <div
            key={ident}
            className={`open-tab ${active ? 'active-tab' : ''} ${isDirty ? 'dirty' : ''}`}
            title={`${TabTitle}.md${isDirty ? ' (unsaved)' : ''}`}
            onClick={() => {
              toDoc();
            }}
          >
            <span className="tab-name">{`${tabName}.md`}</span>
            <Icon
              id="close-tab"
              className="close-tag"
              iconName="times"
              onClick={(e) => {
                e.stopPropagation();
                void deleteTab([ident]);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
