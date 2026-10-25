import React, { ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error in React Component Tree:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Something went wrong</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                {this.state.error?.message || "An unexpected error occurred while loading the application."}
              </p>
            </div>

            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
