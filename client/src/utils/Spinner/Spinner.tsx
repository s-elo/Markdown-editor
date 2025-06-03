import React from 'react';
import './Spinner.scss';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function Spinner({ text = '', size = '5em' }) {
  const header = text ? <h4>{text}</h4> : null;
  return (
    <div className="spinner">
      {header}
      <div className="loader" style={{ height: size, width: size }} />
    </div>
  );
}
