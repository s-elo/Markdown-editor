import { ListBox } from 'primereact/listbox';
import { FC, useEffect, useId, useMemo, useRef, useState } from 'react';

import { ContainerType } from './types';

import { TooltipInput } from '@/components/Editor/components/TooltipInput';

export interface ContainerTitleProps {
  desc?: string;
  containerType: ContainerType;
  contentDom: HTMLElement;
  getReadonly: () => boolean;
  setAttrs?: (attrs: { containerType: ContainerType; desc: string }) => void;
}

export const ContainerTitle: FC<ContainerTitleProps> = ({
  desc = '',
  containerType,
  contentDom,
  getReadonly,
  setAttrs,
}) => {
  const uid = useId();

  const isDetails = containerType === ContainerType.DETAILS;
  const title = desc || (isDetails ? 'Details' : containerType.toUpperCase());

  const [showOperations, setShowOperations] = useState(false);
  const [showSelectorMenu, setShowSelectorMenu] = useState(false);
  const [showEditDesc, setEditDesc] = useState(false);

  const [descInput, setDescInput] = useState(desc);

  const iconRef = useRef<HTMLElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const showSelectorIcon = useMemo(() => {
    return (showOperations || showSelectorMenu) && !getReadonly();
  }, [showOperations, showSelectorMenu, getReadonly]);
  const showEditDescIcon = useMemo(() => {
    return (showOperations || showEditDesc) && !getReadonly();
  }, [showOperations, showEditDesc, getReadonly]);

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

  const showDescEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDesc(!showEditDesc);
  };

  const selectContainerType = (value: ContainerType) => {
    setAttrs?.({ containerType: value, desc: descInput });
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
          {showEditDescIcon && (
            <i className="pi pi-pencil" onClick={showDescEditor} id={`desc-editor-${uid}`}>
              <TooltipInput
                tooltipOptions={{
                  target: `#desc-editor-${uid}`,
                }}
                iconOptions={{
                  id: 'desc-editor-check',
                }}
                value={descInput}
                placeholder="You can add description"
                onChange={(value) => {
                  setDescInput(value);
                }}
                onConfirm={() => {
                  setAttrs?.({ containerType: containerType, desc: descInput });
                }}
              />
            </i>
          )}
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
