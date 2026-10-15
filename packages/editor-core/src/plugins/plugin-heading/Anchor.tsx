import { updateLocationHash } from '../../utils';

import type { FC } from 'react';

export interface AnchorProps {
  id: string;
  text: string;
  toAnchor?: (id: string) => void;
}

export const Anchor: FC<AnchorProps> = ({ id, text, toAnchor }) => (
  <a
    onClick={(event) => {
      event.stopPropagation();
      if (toAnchor) toAnchor(id);
      else updateLocationHash(id);
    }}
    className="heading-anchor"
    aria-label={`Permalink to ${text}`}
  >
    #
  </a>
);
