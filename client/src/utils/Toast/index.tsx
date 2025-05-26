import { createRoot } from 'react-dom/client';

import ToastContainer from './ToastContainer';
import { ToastType } from './type';

const toastRoot = document.createElement('div');
document.body.appendChild(toastRoot);

// eslint-disable-next-line @typescript-eslint/init-declarations
let toastContainerRef: ToastContainer;
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
createRoot(toastRoot).render(<ToastContainer ref={(el) => (toastContainerRef = el!)} />);

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const Toast = (message: string, type: ToastType = 'SUCCESS', duration = 1500) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  toastContainerRef?.addToast(message, type, duration);
};

export default Toast;
