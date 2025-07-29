import { Tooltip } from 'primereact/tooltip';
import { FC } from 'react';

import './Icon.scss';

interface IconProps {
  iconName: string;
  id: string;
  size?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  showToolTip?: boolean;
  toolTipContent?: string;
  toolTipPosition?: 'bottom' | 'left' | 'right' | 'top';
}

export const Icon: FC<IconProps> = ({
  iconName,
  id,
  size = '16px',
  onClick,
  style,
  className = '',
  showToolTip = true,
  toolTipContent,
  toolTipPosition = 'bottom',
}) => {
  return (
    <div className={`icon-wrapper ${className}`} style={style}>
      {showToolTip && (
        <Tooltip className="tool-tip" target={`#icon-${id}`} content={toolTipContent} position={toolTipPosition} />
      )}
      <i
        className={`pi pi-${iconName}`}
        id={`icon-${id}`}
        onClick={onClick}
        style={{ width: size, height: size, fontSize: size }}
      ></i>
    </div>
  );
};
