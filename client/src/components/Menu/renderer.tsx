import { TreeRenderProps } from 'react-complex-tree';
import { Link } from 'react-router-dom';

import { TreeItemData } from './type';

import { useSaveDoc } from '@/utils/hooks/reduxHooks';
import { normalizePath } from '@/utils/utils';

export const renderItem: TreeRenderProps<TreeItemData>['renderItem'] = ({ title, arrow, context, children, item }) => {
  const saveDoc = useSaveDoc();

  return (
    <div className="item-container" {...context.itemContainerWithChildrenProps}>
      <div className="item" {...context.interactiveElementProps}>
        {item.isFolder && arrow}
        <div className="item-title">
          {!item.isFolder && <i className="pi pi-file" style={{ color: 'var(--shallowTextColor)' }}></i>}
          <Link to={`/article/${normalizePath(item.data.path) as string}`} className={`link file`} onClick={saveDoc}>
            {title}
          </Link>
        </div>
      </div>
      <div className="children-container">{children}</div>
    </div>
  );
};

export const renderItemArrow: TreeRenderProps<TreeItemData>['renderItemArrow'] = ({ context }) => {
  return (
    <div className="item-arrow" {...context.arrowProps}>
      <i className="pi pi-angle-right" style={{ transform: context.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}></i>
    </div>
  );
};

export const createRenderItem = (saveDoc: () => Promise<void>): TreeRenderProps<TreeItemData>['renderItem'] => {
  return ({
    title,
    arrow,
    context,
    children,
    item: {
      isFolder,
      data: { path },
    },
  }) => {
    return (
      <div className="item-container" {...context.itemContainerWithChildrenProps}>
        {isFolder ? (
          <div className="item" {...context.interactiveElementProps}>
            {arrow}
            {title}
          </div>
        ) : (
          <Link
            to={`/article/${normalizePath(path) as string}`}
            className="item link file"
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
