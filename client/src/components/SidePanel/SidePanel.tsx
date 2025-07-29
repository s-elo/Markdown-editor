import { useState } from 'react';
import { useSelector } from 'react-redux';

import ConfigBox from '../ConfigBox/ConfigBox';
import GitBox from '../GitBox/GitBox';
import PureOutline from '../Outline/PureOutline';

import { Icon } from '@/components/Icon/Icon';
import { useGetDocQuery } from '@/redux-api/docs';
import { selectCurPath, selectCurScrollTop } from '@/redux-feature/curDocSlice';
import ErrorBoundary from '@/utils/ErrorBoundary/ErrorBoundary';

import './SidePanel.scss';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function SidePanel() {
  const curPath = useSelector(selectCurPath);
  const scrollTop = useSelector(selectCurScrollTop);

  const { data: curDoc } = useGetDocQuery(curPath);

  const { headings, keywords } = curDoc ?? { headings: [] as string[], keywords: [] as string[] };

  const [configShow, setConfigShow] = useState(false);

  return (
    <aside className="side-panel">
      <div
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        className={`operation-icon go-to-top ${scrollTop <= 100 ? 'hidden' : ''}`}
        role="button"
        onClick={() => {
          const milkdownDom = document.getElementsByClassName('milkdown')[0];
          milkdownDom.scroll({ top: 0, behavior: 'smooth' });
        }}
      >
        <Icon id="to-top" iconName="arrow-up" toolTipContent="Back to Top" toolTipPosition="left" />
      </div>
      <div className="operation-icon side-outline">
        <Icon id="view-outline" iconName="list" showToolTip={false} />
        <div className="box content-outline">
          <PureOutline headings={headings} keywords={keywords} path={curPath.split('-')} />
        </div>
      </div>
      <div className="operation-icon side-git">
        <Icon id="git-box" iconName="cloud-upload" showToolTip={false} />
        <div className="box">
          <ErrorBoundary>
            <GitBox />
          </ErrorBoundary>
        </div>
      </div>
      <div
        className="operation-icon config-box"
        title="set configs"
        onClick={() => {
          setConfigShow(true);
        }}
      >
        <Icon id="settings" iconName="cog" toolTipContent="Settings" toolTipPosition="left" />
        {configShow && (
          <ErrorBoundary>
            <ConfigBox setShow={setConfigShow} />
          </ErrorBoundary>
        )}
      </div>
    </aside>
  );
}
