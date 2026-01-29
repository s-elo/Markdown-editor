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

export const renderDragBetweenLine: TreeRenderProps<TreeItemData>['renderDragBetweenLine'] = ({
  draggingPosition,
  lineProps,
}) => (
  <div
    {...lineProps}
    className="drag-between-line"
    style={{
      top:
        draggingPosition.targetType === 'between-items' && draggingPosition.linePosition === 'top'
          ? '0px'
          : draggingPosition.targetType === 'between-items' && draggingPosition.linePosition === 'bottom'
          ? '-4px'
          : '-2px',
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      left: `${draggingPosition.depth * 23}px`,
    }}
  />
);

export const createRenderItem = (): TreeRenderProps<TreeItemData>['renderItem'] => {
  return (props) => {
    const { id } = props.item.data;

    return (
      <div id={id} className="item-container" {...props.context.itemContainerWithChildrenProps}>
        <MenuItem {...props} />
        {props.children}
      </div>
    );
  };
};
