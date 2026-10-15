import { ListBox } from 'primereact/listbox';
import { type FC, useEffect, useId, useMemo, useRef, useState } from 'react';

import { ContainerType } from './types';
import { TooltipInput } from '../../components/TooltipInput';

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

  useEffect(() => {
    setDescInput(desc);
  }, [desc]);
  useEffect(() => {
    const clickHandler = (event: MouseEvent) => {
      if (!listContainerRef.current?.contains(event.target as Node)) setShowSelectorMenu(false);
    };
    window.addEventListener('click', clickHandler);
    return () => {
      window.removeEventListener('click', clickHandler);
    };
  }, []);

  const showSelectorIcon = useMemo(
    () => (showOperations || showSelectorMenu) && !getReadonly(),
    [showOperations, showSelectorMenu, getReadonly],
  );
  const showEditDescIcon = useMemo(
    () => (showOperations || showEditDesc) && !getReadonly(),
    [showOperations, showEditDesc, getReadonly],
  );
  const onToggle = () => {
    if (containerType !== ContainerType.DETAILS) return;
    iconRef.current?.classList.toggle('pi-angle-down');
    iconRef.current?.classList.toggle('pi-angle-right');
    contentDom.classList.toggle('container-content-hidden');
  };

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
      {isDetails && <i ref={iconRef} className="pi pi-angle-right" />}
      <div className="title-container">
        <span>{title}</span>
        {showSelectorIcon && (
          <div className="operations">
            <i
              className="pi pi-arrow-right-arrow-left"
              onClick={(event) => {
                event.stopPropagation();
                setShowSelectorMenu(!showSelectorMenu);
              }}
            >
              {showSelectorMenu && (
                <div
                  className="list-container"
                  ref={listContainerRef}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <ListBox
                    value={containerType}
                    onChange={(event) => setAttrs?.({ containerType: event.value, desc: descInput })}
                    options={Object.values(ContainerType)}
                  />
                </div>
              )}
            </i>
            {showEditDescIcon && (
              <i
                className="pi pi-pencil"
                onClick={(event) => {
                  event.stopPropagation();
                  setEditDesc(!showEditDesc);
                }}
                id={`desc-editor-${uid}`}
              >
                <TooltipInput
                  tooltipOptions={{ target: `#desc-editor-${uid}` }}
                  iconOptions={{ id: 'desc-editor-check' }}
                  value={descInput}
                  placeholder="You can add description"
                  onChange={setDescInput}
                  onConfirm={() => setAttrs?.({ containerType, desc: descInput })}
                />
              </i>
            )}
          </div>
        )}
      </div>
    </summary>
  );
};
