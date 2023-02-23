import React from 'react';
import ReactDOM from 'react-dom';

import ToastContainer from './ToastContainer';
import { ToastType } from './type';

const toastRoot = document.createElement('div');
document.body.appendChild(toastRoot);

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-confusing-void-expression
const toastContainerRef = ReactDOM.render(<ToastContainer />, toastRoot) as unknown as ToastContainer;

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const Toast = (message: string, type: ToastType = 'SUCCESS', duration = 1500) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  toastContainerRef.addToast(message, type, duration);
};

export default Toast;
