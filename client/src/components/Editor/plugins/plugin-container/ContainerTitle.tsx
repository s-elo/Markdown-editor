import { ListBox } from 'primereact/listbox';
import { FC, useEffect, useMemo, useRef, useState } from 'react';

import { ContainerType } from './types';

export interface ContainerTitleProps {
  desc?: string;
  containerType: ContainerType;
  contentDom: HTMLElement;
  getReadonly: () => boolean;
  setContainerType?: (type: ContainerType) => void;
}

export const ContainerTitle: FC<ContainerTitleProps> = ({
  desc = '',
  containerType,
  contentDom,
  getReadonly,
  setContainerType,
}) => {
  const isDetails = containerType === ContainerType.DETAILS;
  const title = desc || (isDetails ? 'Details' : containerType.toUpperCase());

  const [showOperations, setShowOperations] = useState(false);
  const [showSelectorMenu, setShowSelectorMenu] = useState(false);

  const iconRef = useRef<HTMLElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const showSelectorIcon = useMemo(() => {
    return (showOperations || showSelectorMenu) && !getReadonly();
  }, [showOperations, showSelectorMenu, getReadonly]);

  const onToggle = () => {
    if (containerType !== ContainerType.DETAILS) {
      return;
    }

    iconRef.current?.classList.toggle('pi-angle-down');
    iconRef.current?.classList.toggle('pi-angle-right');
    contentDom.classList.toggle('container-content-hidden');
  };

  const showSelectContainerType = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSelectorMenu(!showSelectorMenu);
  };

  const selectContainerType = (value: ContainerType) => {
    setContainerType?.(value);
  };

  const clickHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    if (listContainerRef.current?.contains?.(target)) return;

    setShowSelectorMenu(false);
  };

  useEffect(() => {
    window.addEventListener('click', clickHandler);
    return () => {
      window.removeEventListener('click', clickHandler);
    };
  }, []);

  const titleContent = (
    <div className="title-container">
      <span>{title}</span>
      {showSelectorIcon && (
        <div className="operations">
          <i className="pi pi-arrow-right-arrow-left" onClick={showSelectContainerType}>
            {showSelectorMenu && (
              <div
                className="list-container"
                ref={listContainerRef}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <ListBox
                  value={containerType}
                  onChange={(e) => {
                    selectContainerType(e.value);
                  }}
                  options={Object.keys(ContainerType)}
                />
              </div>
            )}
          </i>
        </div>
      )}
    </div>
  );

  return (
    <summary
      className="milkdown-container-block-title"
      onClick={onToggle}
      onMouseEnter={() => {
        setShowOperations(true);
      }}
      onMouseLeave={() => {
        setShowOperations(false);
      }}
    >
      {isDetails && <i ref={iconRef} className="pi pi-angle-right"></i>}
      {titleContent}
    </summary>
  );
};
