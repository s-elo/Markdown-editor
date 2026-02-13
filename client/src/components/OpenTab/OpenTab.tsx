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
      {curTabs.map(({ path, active }) => {
        const draftKey = getDraftKey(settings?.docRootPath, path);
        const isDirty = draftKeys.includes(draftKey);
        return (
          <div
            key={path}
            className={`open-tab ${active ? 'active-tab' : ''} ${isDirty ? 'dirty' : ''}`}
            title={`${denormalizePath(path).join('/') as string}.md${isDirty ? ' (unsaved)' : ''}`}
            onClick={() => void navigate(`/article/${path as string}`)}
          >
            <span className="tab-name">{`${denormalizePath(path).slice(-1)[0] as string}.md`}</span>
            <Icon
              id="close-tab"
              className="close-tag"
              iconName="times"
              onClick={(e) => {
                e.stopPropagation();
                void deleteTab([path]);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
