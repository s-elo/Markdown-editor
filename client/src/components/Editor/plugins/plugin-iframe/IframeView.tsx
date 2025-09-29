import { ProgressSpinner } from 'primereact/progressspinner';
import { FC, useEffect, useId, useRef, useState } from 'react';

import { TooltipInput } from '@/components/Editor/components/TooltipInput';

interface IframeViewProps {
  src: string;
  readonly?: boolean;
  setAttrs?: (attrs: { src: string }) => void;
}

export const IframeView: FC<IframeViewProps> = ({ src, setAttrs, readonly = true }) => {
  const uid = useId();
  const [inputSrc, setInputSrc] = useState(src);
  const [loading, setLoading] = useState(true);

  const linkRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setLoading(true);
  }, [src]);

  const showEdit = !(loading || readonly);

  return (
    <div className="iframe-plugin-container">
      {showEdit && (
        <TooltipInput
          tooltipOptions={{
            target: `#iframe-plugin-link-${uid}`,
          }}
          iconOptions={{
            id: 'iframe-link-check',
          }}
          value={inputSrc}
          onChange={(value) => {
            setInputSrc(value);
          }}
          onConfirm={() => {
            setAttrs?.({ src: inputSrc });
          }}
        />
      )}
      <span
        ref={linkRef}
        id={`iframe-plugin-link-${uid}`}
        className="iframe-plugin-link"
        onClick={() => src && window.open(src, '_blank')}
      >
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
