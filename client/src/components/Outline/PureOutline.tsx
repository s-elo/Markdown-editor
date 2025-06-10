import React from 'react';

import { useEditorScrollToAnchor } from '@/utils/hooks/docHooks';
import { updateLocationHash } from '@/utils/utils';

export interface PureOutlineProps {
  headings: string[];
  keywords: string[];
  path: string[];
}

const headingSize = [
  {
    fontSize: '20px',
    fontWeight: '500',
  },
  {
    fontSize: '16px',
    fontWeight: '400',
    marginLeft: '1rem',
  },
  {
    fontSize: '14px',
    fontWeight: '300',
    marginLeft: '2rem',
  },
  {
    fontSize: '14px',
    fontWeight: '300',
    marginLeft: '3rem',
  },
];

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function PureOutline({ headings, keywords, path = [] }: PureOutlineProps) {
  const scrollToAnchor = useEditorScrollToAnchor();

  const toAnchor = (e: React.MouseEvent, anchor: string) => {
    e.stopPropagation();

    const anchorDom = scrollToAnchor(anchor, path.join('-'));
    if (anchorDom) {
      // wait for after the scroll event to changed the hash
      setTimeout(() => {
        updateLocationHash(anchorDom.getAttribute('id') ?? '');
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      }, 1000);
    }
  };

  return (
    <>
      {keywords.length !== 0 && (
        <div className="keywords-tags">
          {keywords.map((keyword) => (
            <div
              className="keyword-anchor"
              onClick={(e) => {
                toAnchor(e, keyword);
              }}
              key={keyword}
            >
              {keyword}
            </div>
          ))}
        </div>
      )}
      <br />
      {headings.length !== 0 && (
        <div className="heading-anchors">
          {headings.map((title) => {
            const level = (title.match(/#+/gi) as string[])[0].length;
            const pureHeading = title.replace(/#+\s/g, '');

            return (
              <div
                className="outline-title"
                onClick={(e) => {
                  toAnchor(e, pureHeading);
                }}
                style={{ ...(headingSize[level - 1] ?? {}), color: 'black' }}
                key={path.join('-') + title}
              >
                {pureHeading}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
