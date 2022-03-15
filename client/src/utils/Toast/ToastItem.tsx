import React, { useEffect, useState } from "react";
import { Toast } from "./type";

export default function ToastItem({
  message,
  duration,
  type,
  id,
  remove,
}: Toast) {
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    const removeTimer = setTimeout(() => {
      // hidden animation then remove
      setIsRemoving(true);
      setTimeout(() => {
        if (remove) remove(id);
      }, 500);
    }, duration);

    return () => {
      clearTimeout(removeTimer);
    };
    // eslint-disable-next-line
  }, []);
  return (
    <div
      className={`toast-item bgc-${type.toLowerCase()} ${
        isRemoving ? "toast-hide" : "toast-show"
      }`}
    >
      {message}
    </div>
  );
}
