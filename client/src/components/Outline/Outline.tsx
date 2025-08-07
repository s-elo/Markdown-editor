import { ScrollPanel } from 'primereact/scrollpanel';
import React, { FC, useMemo, useState } from 'react';

import { useEditorScrollToAnchor } from '@/utils/hooks/docHooks';
import { normalizePath, updateLocationHash } from '@/utils/utils';
import 'react-complex-tree/lib/style-modern.css';

import './Outline.scss';

export interface OutlineProps {
  headings: string[];
  keywords: string[];
  path: string[];
}

interface TreeNode {
  level: number;
  title: string;
  children: TreeNode[];
}

function headingsToTree(headings: string[]) {
  const tree: TreeNode[] = [];
  const parentHeadStack: TreeNode[] = [];

  for (const heading of headings) {
    const level = (heading.match(/#+/gi) as string[])[0].length;
    const pureHeading = heading.replace(/#+\s/g, '');

    const curNode: TreeNode = {
      level,
      title: pureHeading,
      children: [],
    };

    let lastParentHead: TreeNode | undefined = parentHeadStack[parentHeadStack.length - 1];
    while (lastParentHead && lastParentHead.level >= level) {
      parentHeadStack.pop();
      lastParentHead = parentHeadStack[parentHeadStack.length - 1];
    }

    if (lastParentHead) {
      lastParentHead.children.push(curNode);
    } else {
      tree.push(curNode);
    }

    parentHeadStack.push(curNode);
  }

  return tree;
}

const Tree = ({ value, onClick }: { value: TreeNode; onClick?: (e: React.MouseEvent, anchor: string) => void }) => {
  const [expand, setExpand] = useState(true);

  return (
    <div className="tree-node">
      <div
        className="tree-node-title"
        onClick={(e) => {
          onClick?.(e, value.title);
        }}
      >
        {value.title}
        {value.children.length > 0 && (
          <i
            className="pi pi-angle-right"
            style={{
              transform: expand ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setExpand(!expand);
            }}
          ></i>
        )}
      </div>
      {expand && (
        <div className="children">
          {value.children.map((child) => (
            <Tree key={child.title} value={child} onClick={onClick} />
          ))}
        </div>
      )}
    </div>
  );
};

export const Outline: FC<OutlineProps> = ({ headings, path = [] }) => {
  const scrollToAnchor = useEditorScrollToAnchor();

  const treeData = useMemo(() => {
    return headingsToTree(headings);
  }, [headings]);

  const toAnchor = (e: React.MouseEvent, anchor: string) => {
    e.stopPropagation();

    const anchorDom = scrollToAnchor(anchor, normalizePath(path));
    if (anchorDom) {
      // wait for after the scroll event to changed the hash
      setTimeout(() => {
        updateLocationHash(anchorDom.getAttribute('id') ?? '');
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      }, 1000);
    }
  };

  return (
    <ScrollPanel className="outline-wrapper">
      {treeData.map((treeNode) => (
        <Tree key={treeNode.title} value={treeNode} onClick={toAnchor} />
      ))}
    </ScrollPanel>
    // <div className="outline-container">
    // {/* {keywords.length !== 0 && (
    //   <div className="keywords-tags">
    //     {keywords.map((keyword) => (
    //       <div
    //         className="keyword-anchor"
    //         onClick={(e) => {
    //           toAnchor(e, keyword);
    //         }}
    //         key={keyword}
    //       >
    //         {keyword}
    //       </div>
    //     ))}
    //   </div>
    // )}
    // <br /> */}
    // {/* {headings.length !== 0 && (
    //   <div className="heading-anchors">
    //     {headings.map((title) => {
    //       const level = (title.match(/#+/gi) as string[])[0].length;
    //       const pureHeading = title.replace(/#+\s/g, '');

    //       return (
    //         <div
    //           className="outline-title"
    //           onClick={(e) => {
    //             toAnchor(e, pureHeading);
    //           }}
    //           style={{ ...(headingSize[level - 1] ?? {}), color: 'black' }}
    //           key={path.join('-') + title}
    //         >
    //           {pureHeading}
    //         </div>
    //       );
    //     })}
    //   </div>
    // )} */}
    // </div>
  );
};
