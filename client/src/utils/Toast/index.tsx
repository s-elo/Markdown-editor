import { MessageSeverity } from 'primereact/api';
import { Toast as PrimeToast } from 'primereact/toast';
import { FC, RefObject, useRef } from 'react';
import { createRoot } from 'react-dom/client';

export const ERROR_DURATION = 3000;
export const SUCCESS_DURATION = 1500;
export const WARNING_DURATION = 1500;
export const INFO_DURATION = 1500;
export const SECONDARY_DURATION = 1500;
export const CONTRAST_DURATION = 1500;

const toastRoot = document.createElement('div');
document.body.appendChild(toastRoot);

let toastTopCenterRef: RefObject<PrimeToast | null> | null = null;
const ToastContainer: FC = () => {
  toastTopCenterRef = useRef<PrimeToast>(null);

  return (
    <>
      <PrimeToast ref={toastTopCenterRef} position="top-center" />
    </>
  );
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
createRoot(toastRoot).render(<ToastContainer />);

const Toast = (message: string, type: MessageSeverity = MessageSeverity.SUCCESS, duration?: number) => {
  const defaultDurationMap: Record<MessageSeverity, number> = {
    [MessageSeverity.ERROR]: ERROR_DURATION,
    [MessageSeverity.SUCCESS]: SUCCESS_DURATION,
    [MessageSeverity.WARN]: WARNING_DURATION,
    [MessageSeverity.INFO]: INFO_DURATION,
    [MessageSeverity.SECONDARY]: SECONDARY_DURATION,
    [MessageSeverity.CONTRAST]: CONTRAST_DURATION,
  };
  duration = duration ?? defaultDurationMap[type];

  toastTopCenterRef?.current?.show({
    severity: type,
    life: duration,
    detail: message,
  });
};

Toast.success = (message: string, duration?: number) => {
  Toast(message, MessageSeverity.SUCCESS, duration);
};
Toast.error = (message: string, duration?: number) => {
  Toast(message, MessageSeverity.ERROR, duration);
};
Toast.warn = (message: string, duration?: number) => {
  Toast(message, MessageSeverity.WARN, duration);
};
Toast.info = (message: string, duration?: number) => {
  Toast(message, MessageSeverity.INFO, duration);
};

export default Toast;
