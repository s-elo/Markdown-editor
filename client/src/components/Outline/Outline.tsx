import { ScrollPanel } from 'primereact/scrollpanel';
import { Tag } from 'primereact/tag';
import React, { FC, useImperativeHandle, useMemo, useReducer } from 'react';

import { SimpleTree, TreeNode } from '../SimpleTree/SimpleTree';

import { useEditorScrollToAnchor } from '@/utils/hooks/docHooks';
import { normalizePath, updateLocationHash } from '@/utils/utils';
import 'react-complex-tree/lib/style-modern.css';

import './Outline.scss';

export interface OutlineRef {
  collapseAll: () => void;
}

export interface OutlineProps {
  headings: string[];
  keywords: string[];
  path: string[];
  onExpand?: (tree: TreeNode) => void;
  ref?: React.RefObject<OutlineRef>;
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

export const Outline: FC<OutlineProps> = ({ headings, path = [], onExpand, ref }) => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

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

  const collapse = (tree: TreeNode) => {
    tree.collapsed = true;
    tree.children.forEach((child) => {
      collapse(child);
    });
  };

  useImperativeHandle(ref, () => ({
    collapseAll: () => {
      treeData.forEach((treeNode) => {
        collapse(treeNode);
      });
      forceUpdate();
    },
  }));

  return (
    <ScrollPanel className="outline-wrapper">
      {treeData.map((treeNode) => (
        <SimpleTree
          key={treeNode.title}
          value={treeNode}
          onClick={toAnchor}
          onExpand={onExpand}
          renderTitle={(node) => (
            <div className="outline-title">
              {node.title}
              <Tag value={`h${node.level}`}></Tag>
            </div>
          )}
        />
      ))}
    </ScrollPanel>
  );
};
