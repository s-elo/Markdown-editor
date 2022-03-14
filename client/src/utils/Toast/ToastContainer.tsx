import React from "react";
import { nanoid } from "@reduxjs/toolkit";
import { Toast, ToastType } from "./type";
import ToastItem from "./ToastItem";
import "./index.less";

export default class ToastContainer extends React.Component {
  state = {
    toastList: [] as Toast[],
  };

  addToast(message: string, type: ToastType, duration: number) {
    const toastList = this.state.toastList.concat({
      id: nanoid(),
      type,
      message,
      duration,
      remove: (id) => {
        this.setState({
          toastList: this.state.toastList.filter((toast) => toast.id !== id),
        });
      },
    });

    this.setState({ toastList });
  }

  render() {
    return (
      <div className="toast-container">
        {this.state.toastList.map((toastInfo: Toast) => (
          <ToastItem {...toastInfo} key={toastInfo.id} />
        ))}
      </div>
    );
  }
}
