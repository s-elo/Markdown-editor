import { createRoot } from 'react-dom/client';

import ToastContainer from './ToastContainer';
import { ToastType } from './type';

export const ERROR_DURATION = 3000;
export const SUCCESS_DURATION = 1500;
export const WARNING_DURATION = 1500;

const toastRoot = document.createElement('div');
document.body.appendChild(toastRoot);

// eslint-disable-next-line @typescript-eslint/init-declarations
let toastContainerRef: ToastContainer;
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
createRoot(toastRoot).render(<ToastContainer ref={(el) => void (toastContainerRef = el!)} />);

const Toast = (message: string, type: ToastType = 'SUCCESS', duration?: number) => {
  duration =
    duration ??
    {
      ERROR: ERROR_DURATION,
      SUCCESS: SUCCESS_DURATION,
      WARNING: WARNING_DURATION,
    }[type];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  toastContainerRef?.addToast(message, type, duration);
};

export default Toast;
