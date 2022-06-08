import React, { Component, ErrorInfo, ReactChild } from "react";

interface Props {
  children?: ReactChild;
  displayInfo?: string;
  log?: boolean;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.log && console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const { displayInfo } = this.props;
      return <h1>{displayInfo ? displayInfo : "error occurs!"}</h1>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
