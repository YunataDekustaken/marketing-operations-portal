import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F4] dark:bg-[#0A0A0A] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Something went wrong</h1>
            <p className="text-black/60 dark:text-white/60 mb-6">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#141414] dark:bg-white text-white dark:text-black py-3 rounded-xl font-semibold hover:bg-black dark:hover:bg-white/90 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
