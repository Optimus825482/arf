'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 relative z-10">
          <div className="glass-panel p-8 max-w-md text-center space-y-6">
            <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto" />
            <h2 className="text-xl font-display text-white">Sistem Arızası Tespit Edildi</h2>
            <p className="text-slate-400 text-sm">
              Pilot, bir sorunla karşılaştık. Endişelenme, veriler güvende. 
              Sistemi yeniden başlatmayı dene.
            </p>
            {this.state.error && (
              <pre className="text-xs text-red-400/70 bg-red-950/20 p-3 rounded-xl overflow-auto max-h-24 text-left">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="neon-btn-blue px-6 py-3 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Sistemi Yeniden Başlat
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
