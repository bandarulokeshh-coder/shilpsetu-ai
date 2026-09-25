import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * Catches render-time crashes so a single bad page shows a friendly message
 * instead of a blank white screen.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Something went wrong' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Oops — something broke</h1>
          <p className="text-gray-600 mb-4">
            Sorry about that. Your data is safe — try reloading the page.
          </p>
          {this.state.message && (
            <p className="text-xs text-gray-400 mb-6 break-words">{this.state.message}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="btn-primary">
              Reload
            </button>
            <button onClick={() => (window.location.href = '/')} className="btn-secondary">
              Go to home
            </button>
          </div>
        </div>
      </div>
    );
  }
}