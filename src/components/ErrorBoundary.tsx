import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error at ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || "";
      const isChunkError = errorMsg.includes("Failed to fetch dynamically imported module") || 
                          errorMsg.includes("Loading chunk");

      return this.props.fallback || (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-black overflow-y-auto">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Something went wrong</h2>
          <p className="text-gray-400 text-sm mt-2 mb-8 max-w-xs leading-relaxed">
            {isChunkError 
              ? "We couldn't load some parts of the app. This usually happens after an update."
              : "An unexpected error occurred in NoteVix."}
          </p>
          
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-600/20 active:scale-95 transition-all"
            >
              Reload Page
            </button>
            
            <button 
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
              }}
              className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-white/5 transition-all"
            >
              Emergency Fix (Clear Cache)
            </button>
          </div>

          <div className="mt-12 p-4 bg-white/5 rounded-xl border border-white/5 w-full max-w-sm">
            <p className="text-[9px] text-gray-600 font-mono text-left break-all">
              Error: {this.state.error?.message || "Unknown"}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }

}

export default ErrorBoundary;
