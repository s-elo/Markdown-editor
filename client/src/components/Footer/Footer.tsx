import BallotIcon from '@mui/icons-material/BallotOutlined';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExitOutlined';
import FullscreenIcon from '@mui/icons-material/FullscreenOutlined';
import MirrorIcon from '@mui/icons-material/ImportContactsOutlined';
import { FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Icon } from '@/components/Icon/Icon';
import {
  selectMirrorCollapse,
  selectNarrowMode,
  selectOutlineCollapse,
  updateGlobalOpts,
} from '@/redux-feature/globalOptsSlice';
import { useSwitchNarrowMode } from '@/utils/hooks/reduxHooks';

import './Footer.scss';

export const Footer: FC = () => {
  const dispatch = useDispatch();
  const outlineCollapse = useSelector(selectOutlineCollapse);
  const mirrorCollapse = useSelector(selectMirrorCollapse);
  const narrowMode = useSelector(selectNarrowMode);

  const switchNarrowMode = useSwitchNarrowMode();

  const clickOutline = () => {
    dispatch(
      updateGlobalOpts({
        keys: ['outlineCollapse'],
        values: [!outlineCollapse],
      }),
    );
  };

  return (
    <div className="app-footer">
      <div className="left-group"></div>
      <div className="right-group">
        <Icon
          id="view-outline"
          icon={BallotIcon}
          toolTipContent="Outline"
          toolTipPosition="top"
          onClick={clickOutline}
        />
        <Icon
          id="code-mirror-toggle"
          icon={MirrorIcon}
          toolTipContent={'mirror'}
          toolTipPosition="top"
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
          id="full-narrow-toggle"
          icon={narrowMode ? FullscreenIcon : FullscreenExitIcon}
          toolTipPosition="left"
          toolTipContent={narrowMode ? 'Full' : 'Narrow'}
          onClick={switchNarrowMode}
        />
      </div>
    </div>
  );
};
