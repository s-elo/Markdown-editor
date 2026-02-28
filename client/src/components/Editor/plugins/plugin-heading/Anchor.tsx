import { FC } from 'react';

import { updateLocationHash } from '@/utils/utils';

export interface AnchorProps {
  id: string;
  text: string;
  toAnchor?: (id: string) => void;
}

export const Anchor: FC<AnchorProps> = ({ id, text, toAnchor }) => {
  const onClickAnchor = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (toAnchor) {
      toAnchor(id);
      return;
    }

    updateLocationHash(id);
  };

  return (
    <a onClick={onClickAnchor} className="heading-anchor" aria-label={`Permalink to ${text}`}>
      #
    </a>
  );
};
