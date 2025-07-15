import { TreeRenderProps } from 'react-complex-tree';

import { MenuItem } from './MenuItem';
import { TreeItemData } from './type';

export const renderItemArrow: TreeRenderProps<TreeItemData>['renderItemArrow'] = ({ context }) => {
  return (
    <div className="item-arrow" {...context.arrowProps}>
      <i className="pi pi-angle-right" style={{ transform: context.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}></i>
    </div>
  );
};

export const createRenderItem = (): TreeRenderProps<TreeItemData>['renderItem'] => {
  return ({ title, arrow, context, children, item }) => {
    const { id } = item.data;

    return (
      <div id={id} className="item-container" {...context.itemContainerWithChildrenProps}>
        <MenuItem title={title} arrow={arrow} context={context} item={item} />
        <div className="children-container">{children}</div>
      </div>
    );
  };
};
