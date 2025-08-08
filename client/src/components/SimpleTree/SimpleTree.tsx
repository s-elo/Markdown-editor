import { FC, useEffect, useState } from 'react';

import './SimpleTree.scss';

export interface TreeNode {
  level: number;
  title: string;
  children: TreeNode[];
  /** if true, children of this tree node will be collapsed */
  collapsed?: boolean;
}

export interface SimpleTreeProps {
  value: TreeNode;
  renderTitle?: (tree: TreeNode) => React.ReactNode;
  onClick?: (e: React.MouseEvent, anchor: string) => void;
  onExpand?: (tree: TreeNode) => void;
}

export const SimpleTree: FC<SimpleTreeProps> = ({ value, renderTitle, onClick, onExpand }) => {
  const [expand, setExpand] = useState(true);

  useEffect(() => {
    if (value.collapsed) {
      setExpand(false);
    }
  }, [value.collapsed]);

  const childrenStyle: React.CSSProperties = {
    height: expand ? 'auto' : 0,
    display: expand ? 'block' : 'none',
    overflow: expand ? 'visible' : 'hidden',
  };

  return (
    <div className="simple-tree-node">
      <div
        // usually will not write two same title in the same level, I suppose..
        id={`${value.title}-${value.level}`}
        className="simple-tree-node-title"
        onClick={(e) => {
          onClick?.(e, value.title);
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
              }
              setExpand(!expand);
            }}
          ></i>
        )}
      </div>
      <ul className="children" style={childrenStyle}>
        {value.children.map((child) => (
          <SimpleTree key={child.title} value={child} onClick={onClick} renderTitle={renderTitle} onExpand={onExpand} />
        ))}
      </ul>
    </div>
  );
};
