import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { selectCurTabs } from '@/redux-feature/curDocSlice';
import { useDeleteTab, useSaveDoc } from '@/utils/hooks/reduxHooks';
import { denormalizePath } from '@/utils/utils';
import './OpenTab.scss';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function OpenTab() {
  const curTabs = useSelector(selectCurTabs);

  const navigate = useNavigate();

  const deleteTab = useDeleteTab();
  const saveDoc = useSaveDoc();

  return (
    <div className="open-tab-container">
      {curTabs.map(({ path, active }) => (
        <div
          key={path}
          className={`open-tab ${active ? 'active-tab' : ''}`}
          title={`${denormalizePath(path).join('/') as string}.md`}
          onClick={() => {
            // auto save when switch
            saveDoc();
            void navigate(`/article/${path as string}`);
          }}
        >
          <span className="tab-name">{`${denormalizePath(path).slice(-1)[0] as string}.md`}</span>
          <span
            className="close-tag"
            onClick={(e) => {
              e.stopPropagation();
              deleteTab([path]);
            }}
          >
            ×
          </span>
        </div>
      ))}
    </div>
  );
}
