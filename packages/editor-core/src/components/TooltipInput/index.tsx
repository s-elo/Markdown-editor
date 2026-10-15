import { InputText } from 'primereact/inputtext';
import { Tooltip, type TooltipProps } from 'primereact/tooltip';

import { Icon, type IconProps } from '../Icon';

import type { FC } from 'react';

import './index.scss';

export interface TooltipInputProps {
  tooltipOptions: TooltipProps;
  iconOptions: IconProps;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
}

export const TooltipInput: FC<TooltipInputProps> = ({
  tooltipOptions,
  iconOptions,
  value,
  placeholder,
  onChange,
  onConfirm,
}) => (
  <Tooltip autoHide={false} className="tooltip-input" {...tooltipOptions}>
    <InputText
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
    <Icon size="12px" iconName="check" onClick={onConfirm} showToolTip={false} {...iconOptions} />
  </Tooltip>
);
