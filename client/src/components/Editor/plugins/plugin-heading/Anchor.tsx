import { FC } from 'react';
import { useDispatch } from 'react-redux';

import { updateGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { scrollToEditorAnchor, scrollToOutlineAnchor } from '@/utils/hooks/docHooks';
import { updateLocationHash } from '@/utils/utils';

export interface AnchorProps {
  id: string;
  text: string;
}

export const Anchor: FC<AnchorProps> = ({ id, text }) => {
  const dispatch = useDispatch();

  const toAnchor = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(updateGlobalOpts({ keys: ['anchor'], values: [id] }));

    updateLocationHash(id);
    scrollToEditorAnchor(id);
    scrollToOutlineAnchor(id, true);
  };

  return (
    <a onClick={toAnchor} className="heading-anchor" aria-label={`Permalink to ${text}`}>
      #
    </a>
  );
};
