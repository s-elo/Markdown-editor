import BallotIcon from '@mui/icons-material/BallotOutlined';
import { FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Icon } from '@/components/Icon/Icon';
import { selectOutlineCollapse, updateGlobalOpts } from '@/redux-feature/globalOptsSlice';

import './Footer.scss';

export const Footer: FC = () => {
  const dispatch = useDispatch();
  const outlineCollapse = useSelector(selectOutlineCollapse);

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
          toolTipPosition="left"
          onClick={clickOutline}
        />
      </div>
    </div>
  );
};
