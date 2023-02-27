import { nanoid } from '@reduxjs/toolkit';
import React from 'react';

import ToastItem from './ToastItem';
import { Toast, ToastType } from './type';
import './index.less';

export default class ToastContainer extends React.Component {
  public state = {
    toastList: [] as Toast[],
  };

  public addToast(message: string, type: ToastType, duration: number) {
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

  public render() {
    return (
      <div className="toast-container">
        {this.state.toastList.map((toastInfo: Toast) => (
          <ToastItem {...toastInfo} key={toastInfo.id} />
        ))}
      </div>
    );
  }
}
