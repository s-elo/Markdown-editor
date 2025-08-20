import { ScrollPanel } from 'primereact/scrollpanel';
import { Tag } from 'primereact/tag';
import React, { FC, useCallback, useEffect, useImperativeHandle, useMemo, useReducer, useState } from 'react';
import { useSelector } from 'react-redux';

import { getTreeItem, SimpleTree, TreeNode } from '../SimpleTree/SimpleTree';

import { Heading } from '@/redux-feature/curDocSlice';
import { selectAnchor } from '@/redux-feature/globalOptsSlice';
import { scrollToEditorAnchor } from '@/utils/hooks/docHooks';
import { updateLocationHash } from '@/utils/utils';
import 'react-complex-tree/lib/style-modern.css';

import './Outline.scss';

export interface OutlineRef {
  collapseAll: () => void;
}

export interface OutlineProps {
  headings: Heading[];
  keywords: string[];
  path: string[];
  onExpand?: (tree: TreeNode) => void;
  ref?: React.RefObject<OutlineRef>;
}

/**
 * sequential headings to tree structure
 * @example
 * ```ts
 * headings = [
 *  {level: 1, text: 'Heading 1', id: 'heading-1'},
 *  {level: 2, text: 'Heading 2', id: 'heading-2'},
 *  {level: 1, text: 'Heading 3', id: 'heading-3'},
 * ]
 * ```
 * @returns
 * ```ts
 * tree = [
 *  {level: 1, text: 'Heading 1', id: 'heading-1', children: [
 *    {level: 2, text: 'Heading 2', id: 'heading-2', children: []},
 *  ]},
 *  {level: 1, text: 'Heading 3', id: 'heading-3', children: []},
 * ]
 * ```
 * */
function headingsToTree(headings: Heading[]) {
  const tree: TreeNode[] = [];
  const parentHeadStack: TreeNode[] = [];

  for (const heading of headings) {
    const { level, text, id } = heading;
    const curNode: TreeNode = {
      id,
      level,
      title: text,
      parent: null,
      children: [],
    };

    let lastParentHead: TreeNode | undefined = parentHeadStack[parentHeadStack.length - 1];
    while (lastParentHead && lastParentHead.level >= level) {
      parentHeadStack.pop();
      lastParentHead = parentHeadStack[parentHeadStack.length - 1];
    }

    if (lastParentHead) {
      lastParentHead.children.push(curNode);
      curNode.parent = lastParentHead;
    } else {
      tree.push(curNode);
    }

    parentHeadStack.push(curNode);
  }

  return tree;
}

export const Outline: FC<OutlineProps> = ({ headings, onExpand, ref }) => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const anchor = useSelector(selectAnchor);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  const treeData = useMemo(() => {
    return headingsToTree(headings);
  }, [headings]);

  const selectToNode = useCallback(
    (id: string) => {
      const node = getTreeItem(treeData, id);
      let parent = node?.parent;
      while (parent) {
        if (parent?.children?.length && parent.collapsed === true) {
          parent.collapsed = false;
        }
        parent = parent.parent;
      }
      setSelectedNode(node ?? null);
    },
    [treeData],
  );

  const toAnchor = (e: React.MouseEvent, node: TreeNode) => {
    e.stopPropagation();
    const anchorHash = node.id.replace('outline-', '');
    updateLocationHash(anchorHash);
    scrollToEditorAnchor(anchorHash);

    selectToNode(node.id);
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

  const getId = (node: TreeNode) => `outline-${node.id}`;

  useEffect(() => {
    selectToNode(anchor);
  }, [anchor]);

  return (
    <ScrollPanel className="outline-wrapper">
      {treeData.map((treeNode) => (
        <SimpleTree
          getId={getId}
          selectedNode={selectedNode}
          key={getId(treeNode)}
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
