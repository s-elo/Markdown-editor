import { FC, useEffect, useState } from 'react';

import './SimpleTree.scss';

export interface TreeNode {
  level: number;
  title: string;
  id: string;
  children: TreeNode[];
  parent: TreeNode | null;
  /** if true, children of this tree node will be collapsed */
  collapsed?: boolean;
}

export interface SimpleTreeProps {
  value: TreeNode;
  selectedNode?: TreeNode | null;
  getId?: (node: TreeNode) => string;
  renderTitle?: (tree: TreeNode) => React.ReactNode;
  onClick?: (e: React.MouseEvent, node: TreeNode) => void;
  onExpand?: (tree: TreeNode) => void;
}

export const SimpleTree: FC<SimpleTreeProps> = ({ value, renderTitle, onClick, onExpand, getId, selectedNode }) => {
  const [expand, setExpand] = useState(true);

  useEffect(() => {
    if (value.collapsed) {
      setExpand(false);
    } else if (value.collapsed === false) {
      setExpand(true);
    }
  }, [value.collapsed]);

  const childrenStyle: React.CSSProperties = {
    height: expand ? 'auto' : 0,
    display: expand ? 'block' : 'none',
    overflow: expand ? 'visible' : 'hidden',
  };

  const isSelected = selectedNode?.id === value.id;

  return (
    <div className={`simple-tree-node ${isSelected ? 'simple-tree-selected' : ''}`}>
      <div
        // usually will not write two same title in the same level, I suppose..
        id={getId?.(value) ?? value.id}
        className="simple-tree-node-title"
        onClick={(e) => {
          onClick?.(e, value);
        }}
      >
        {renderTitle ? renderTitle(value) : value.title}
        {value.children.length > 0 && (
          <i
            className="pi pi-angle-right"
            style={{
              transform: expand ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              // toggle to expand state
              if (!expand) {
                onExpand?.(value);
                value.collapsed = false;
              } else {
                value.collapsed = true;
              }
              setExpand(!expand);
            }}
          ></i>
        )}
      </div>
      <ul className="children" style={childrenStyle}>
        {value.children.map((child) => (
          <SimpleTree
            key={getId?.(child) ?? child.id}
            selectedNode={selectedNode}
            value={child}
            onClick={onClick}
            renderTitle={renderTitle}
            onExpand={onExpand}
            getId={getId}
          />
        ))}
      </ul>
    </div>
  );
};

export function getTreeItem(tree: TreeNode[], id: string): TreeNode | undefined {
  for (const item of tree) {
    if (item.id === id) {
      return item;
    }
    const child = getTreeItem(item.children, id);
    if (child) {
      return child;
    }
  }
}
