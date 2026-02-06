import { ListBox, ListBoxChangeEvent, ListBoxProps } from 'primereact/listbox';
import { FC, useState } from 'react';

import './Cascader.scss';

export interface CascaderItemValue {
  path: string[];
}

export interface CascaderListItem {
  label: string;
  value: CascaderItemValue;
}

interface CascaderProps {
  /** An array of list, represented as levels */
  data: CascaderListItem[][];
  onSelectItem?: (value: CascaderItemValue) => void;
}

const ListItemWrapper: FC<ListBoxProps> = (props) => {
  const [selectValue, setSelectValue] = useState<CascaderItemValue | null>(null);
  return (
    <ListBox
      {...props}
      value={selectValue}
      onChange={(e) => {
        if (!e.value) {
          props.onChange?.({ ...e, value: selectValue });
          return;
        }

        setSelectValue(e.value);
        props.onChange?.(e);
      }}
    />
  );
};

export const Cascader: FC<CascaderProps> = ({ data, onSelectItem }) => {
  const itemTemplate = (item: CascaderListItem) => {
    return (
      <div className="cascader-item">
        <div className="item-label">{item.label}</div>
        <i className="pi pi-angle-right"></i>
      </div>
    );
  };

  const handleSelectItem = (event: ListBoxChangeEvent) => {
    onSelectItem?.(event.value);
  };

  return (
    <div className="cascader-container">
      <div className="box-list">
        {data.map((list, level) => (
          <div key={level} className="list-item-wrapper">
            {list.length ? (
              <ListItemWrapper options={list} itemTemplate={itemTemplate} onChange={handleSelectItem} />
            ) : (
              'Empty'
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
