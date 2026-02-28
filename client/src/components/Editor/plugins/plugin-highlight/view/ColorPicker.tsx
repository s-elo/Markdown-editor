import { ListBox, ListBoxChangeEvent } from 'primereact/listbox';
import { FC, useEffect, useState } from 'react';

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
  const [selectedColor, setSelectedColor] = useState<string>(initialColor);

  useEffect(() => {
    setSelectedColor(initialColor);
  }, [initialColor]);

  const groupTemplate = (option: { label: string }) => {
    return <div className="group-title">{option.label}</div>;
  };

  const itemTemplate = (option: { label: string; value: string }) => {
    return (
      <div className="color-item">
        <div className="demo" style={{ backgroundColor: option.value }}>
          A
        </div>
        <div className="desc">{option.label}</div>
      </div>
    );
  };

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
        onChange={(e: ListBoxChangeEvent) => {
          setSelectedColor(e.value);
          onColorChange(e.value);
        }}
      />
    </div>
  );
};
