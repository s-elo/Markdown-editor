import React from "react";
import ReactDOM from "react-dom";
import ToastContainer from "./ToastContainer";
import { ToastType } from "./type";

const toastRoot = document.createElement("div");
document.body.appendChild(toastRoot);
const toastContainerRef = ReactDOM.render(<ToastContainer />, toastRoot);

const Toast = (
  message: string,
  type: ToastType = "SUCCESS",
  duration: number = 1500
) => {
  (toastContainerRef as any).addToast(message, type, duration);
};

export default Toast;
