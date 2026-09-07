import { ListBox, type ListBoxChangeEvent } from 'primereact/listbox';
import { type FC, useEffect, useState } from 'react';

export interface ColorOptions {
  label: string;
  value?: string;
  code?: string;
  items?: ColorOptions[];
}

export interface ColorPickerProps {
  onColorChange: (color: string) => void;
  initialColor: string;
  colorOptions: ColorOptions[];
}

export const ColorPicker: FC<ColorPickerProps> = ({ onColorChange, initialColor, colorOptions }) => {
  const [selectedColor, setSelectedColor] = useState(initialColor);
  useEffect(() => {
    setSelectedColor(initialColor);
  }, [initialColor]);

  const groupTemplate = (option: { label: string }) => <div className="group-title">{option.label}</div>;
  const itemTemplate = (option: { label: string; value: string }) => (
    <div className="color-item">
      <div className="demo" style={{ backgroundColor: option.value }}>
        A
      </div>
      <div className="desc">{option.label}</div>
    </div>
  );

  return (
    <div className="color-picker-container">
      <ListBox
        value={selectedColor}
        options={colorOptions}
        optionLabel="label"
        optionGroupLabel="label"
        optionGroupChildren="items"
        optionGroupTemplate={groupTemplate}
        itemTemplate={itemTemplate}
        className="color-picker-listbox"
        onChange={(event: ListBoxChangeEvent) => {
          setSelectedColor(event.value);
          onColorChange(event.value);
        }}
      />
    </div>
  );
};
