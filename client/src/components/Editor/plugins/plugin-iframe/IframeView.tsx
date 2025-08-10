import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tooltip } from 'primereact/tooltip';
import { FC, useEffect, useId, useState } from 'react';

import { Icon } from '@/components/Icon/Icon';

interface IframeViewProps {
  src: string;
  readonly?: boolean;
  setAttrs?: (attrs: { src: string }) => void;
}

export const IframeView: FC<IframeViewProps> = ({ src, setAttrs, readonly = true }) => {
  const uid = useId();
  const [inputSrc, setInputSrc] = useState(src);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
  }, [src]);

  return (
    <div className="iframe-plugin-container">
      <Tooltip target={`#iframe-plugin-link-${uid}`} autoHide={false} className="iframe-link-tooltip">
        <InputText
          disabled={readonly || loading}
          type="text"
          value={inputSrc}
          onChange={(e) => {
            setInputSrc(e.target.value);
          }}
        />
        {!(loading || readonly) && (
          <Icon
            size="12px"
            iconName="check"
            id="iframe-link-check"
            onClick={() => {
              setAttrs?.({ src: inputSrc });
            }}
            showToolTip={false}
          />
        )}
      </Tooltip>
      <span id={`iframe-plugin-link-${uid}`} className="iframe-plugin-link" onClick={() => window.open(src, '_blank')}>
        <i className="pi pi-external-link icon-btn" />
      </span>
      {loading && (
        <div className="iframe-loader">
          <ProgressSpinner style={{ width: '25px', height: '25px' }} />
        </div>
      )}
      <iframe
        src={src}
        contentEditable={false}
        className={`iframe-plugin ${loading ? 'loading' : ''}`}
        onLoad={() => {
          setLoading(false);
        }}
      />
    </div>
  );
};
