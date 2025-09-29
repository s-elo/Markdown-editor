import { InputText } from 'primereact/inputtext';
import { Tooltip, TooltipProps } from 'primereact/tooltip';
import { FC } from 'react';

import { Icon, IconProps } from '@/components/Icon/Icon';

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
}) => {
  return (
    <Tooltip autoHide={false} className="tooltip-input" {...tooltipOptions}>
      <InputText
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
      <Icon
        size="12px"
        iconName="check"
        onClick={() => {
          onConfirm();
        }}
        showToolTip={false}
        {...iconOptions}
      />
    </Tooltip>
  );
};
