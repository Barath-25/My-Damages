import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
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

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isFirebaseError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Firebase Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path}`;
            isFirebaseError = true;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-[2.5rem] shadow-2xl border border-black/5 text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-brand-dark mb-4 tracking-tight">Something went wrong</h2>
            <p className="text-zinc-500 mb-8 text-sm leading-relaxed">
              {isFirebaseError ? "There was a problem communicating with the database. This might be due to insufficient permissions or a configuration issue." : "We encountered an error while running the application."}
            </p>
            <div className="bg-rose-50 p-4 rounded-2xl mb-8 text-left">
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Error Details</p>
              <p className="text-xs font-mono text-rose-600 break-all">{errorMessage}</p>
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-dark transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-primary/20"
            >
              <RefreshCcw className="w-5 h-5" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
