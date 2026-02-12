import { Tooltip } from 'primereact/tooltip';
import { FC } from 'react';

import './Icon.scss';

export interface IconProps {
  /** for primeReact icon  */
  iconName?: string;
  id: string;
  /** for material icon */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
  size?: string;
  disabled?: boolean;
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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  icon: IconCom,
  size = '16px',
  disabled = false,
  onClick,
  style,
  className = '',
  showToolTip = true,
  toolTipContent,
  toolTipPosition = 'bottom',
}) => {
  return (
    <div
      className={`icon-wrapper${className ? ` ${className}` : ''}`}
      style={style}
      onClick={(e) => {
        if (disabled) {
          return;
        }
        onClick?.(e);
      }}
      id={`icon-${id}`}
    >
      {showToolTip && (
        <Tooltip className="icon-tool-tip" target={`#icon-${id}`} content={toolTipContent} position={toolTipPosition} />
      )}
      {IconCom ? (
        <span className={`icon icon-com${disabled ? ' disabled' : ''}`} style={{ width: size, height: size }}>
          <IconCom />
        </span>
      ) : (
        <i
          className={`icon pi pi-${iconName ?? ''} ${disabled ? 'disabled' : ''}`}
          style={{ width: size, height: size, fontSize: size }}
        ></i>
      )}
    </div>
  );
};
