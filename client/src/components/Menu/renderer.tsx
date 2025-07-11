import { TreeRenderProps } from 'react-complex-tree';
import { Link } from 'react-router-dom';

import { TreeItemData } from './type';

import { normalizePath } from '@/utils/utils';

export const renderItemArrow: TreeRenderProps<TreeItemData>['renderItemArrow'] = ({ context }) => {
  return (
    <div className="item-arrow" {...context.arrowProps}>
      <i className="pi pi-angle-right" style={{ transform: context.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}></i>
    </div>
  );
};

export const createRenderItem = (
  saveDoc: () => Promise<void>,
  curDocPath: string,
): TreeRenderProps<TreeItemData>['renderItem'] => {
  return ({
    title,
    arrow,
    context,
    children,
    item: {
      isFolder,
      data: { path, id },
    },
  }) => {
    const docPath = normalizePath(path);

    return (
      <div id={id} className="item-container" {...context.itemContainerWithChildrenProps}>
        {isFolder ? (
          <div className="item" {...context.interactiveElementProps}>
            {arrow}
            {title}
          </div>
        ) : (
          <Link
            to={`/article/${docPath as string}`}
            className={`item link file ${docPath === curDocPath ? 'selected' : ''}`}
            onClick={() => void saveDoc()}
          >
            <i className="pi pi-file" style={{ color: 'var(--shallowTextColor)' }}></i>
            {title}
          </Link>
        )}
        <div className="children-container">{children}</div>
      </div>
    );
  };
};
