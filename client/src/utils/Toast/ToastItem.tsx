import React, { useEffect, useState } from 'react';

import { Toast } from './type';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function ToastItem({ message, duration, type, id, remove }: Toast) {
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    const removeTimer = setTimeout(() => {
      // hidden animation then remove
      setIsRemoving(true);
      setTimeout(() => {
        if (remove) remove(id);
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      }, 500);
    }, duration);

    return () => {
      clearTimeout(removeTimer);
    };
    // eslint-disable-next-line
  }, []);
  return (
    <div className={`toast-item bgc-${type.toLowerCase()} ${isRemoving ? 'toast-hide' : 'toast-show'}`}>{message}</div>
  );
}
