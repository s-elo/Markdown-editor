import { nanoid } from '@reduxjs/toolkit';
import React from 'react';

import ToastItem from './ToastItem';
import { Toast, ToastType } from './type';
import './index.less';

export default class ToastContainer extends React.Component {
  private readonly _state = {
    toastList: [] as Toast[],
  };

  public addToast(message: string, type: ToastType, duration: number) {
    const toastList = this._state.toastList.concat({
      id: nanoid(),
      type,
      message,
      duration,
      remove: (id) => {
        this.setState({
          toastList: this._state.toastList.filter((toast) => toast.id !== id),
        });
      },
    });

    this.setState({ toastList });
  }

  public render() {
    return (
      <div className="toast-container">
        {this._state.toastList.map((toastInfo: Toast) => (
          <ToastItem {...toastInfo} key={toastInfo.id} />
        ))}
      </div>
    );
  }
}
