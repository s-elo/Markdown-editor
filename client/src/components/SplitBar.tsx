import { SplitProps } from '@uiw/react-split';

export const SplitBar: SplitProps['renderBar'] = ({ onMouseDown, ...props }) => {
  return (
    <div {...props} style={{ boxShadow: 'none', background: 'transparent' }}>
      <div onMouseDown={onMouseDown} style={{ boxShadow: 'none' }} className="split-bar" />
    </div>
  );
};
