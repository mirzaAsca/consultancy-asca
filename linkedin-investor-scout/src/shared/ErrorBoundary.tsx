import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  /** Short label used in the error surface and console logs (e.g. 'popup', 'dashboard'). */
  scope: string;
  /** Render compact layout suitable for the 380×560 popup. */
  compact?: boolean;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string | null;
}

/**
 * Top-level error boundary used by the popup and dashboard entry points.
 *
 * MV3 surfaces silently die when a React tree throws; this boundary converts
 * any render / lifecycle error into a visible fallback with a reload action and
 * logs structured context for debugging.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ componentStack: info.componentStack ?? null });
    console.error(`[investor-scout] ${this.props.scope} crashed`, {
      scope: this.props.scope,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  handleReset = (): void => {
    this.setState({ error: null, componentStack: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    const compact = this.props.compact ?? false;
    const message = error.message || 'Unknown error';

    return (
      <div
        role="alert"
        className={
          compact
            ? 'flex h-full w-full flex-col gap-3 bg-bg p-4 text-gray-100'
            : 'flex min-h-screen w-full items-center justify-center bg-bg p-8 text-gray-100'
        }
      >
        <div
          className={
            compact
              ? 'flex h-full flex-col gap-3'
              : 'w-full max-w-lg rounded-lg border border-red-700 bg-bg-card p-6'
          }
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <h1 className={compact ? 'text-sm font-semibold' : 'text-base font-semibold'}>
              Something went wrong
            </h1>
          </div>
          <p className={compact ? 'text-[11px] text-gray-400' : 'text-xs text-gray-400'}>
            The {this.props.scope} hit an unexpected error. Your prospect data is safe — it
            lives in IndexedDB and is unaffected.
          </p>
          <pre
            className={
              'max-h-48 overflow-auto rounded-md border border-red-900/60 bg-red-950/40 p-2 font-mono text-[10px] text-red-100 ' +
              (compact ? '' : 'text-xs')
            }
          >
            {message}
          </pre>
          {!compact && componentStack && (
            <details className="text-[11px] text-gray-400">
              <summary className="cursor-pointer text-gray-300 hover:text-white">
                Component stack
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-gray-800 bg-bg p-2 font-mono text-[10px] text-gray-400">
                {componentStack}
              </pre>
            </details>
          )}
          <div className="mt-auto flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-md border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-500 hover:text-white"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
