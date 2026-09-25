import { Component, type ReactNode } from 'react';

/** React already logs caught errors in dev; there is no remote reporting (privacy by design). */

export interface ErrorBoundaryProps {
  /** Rendered instead of children after an error; `reset` retries rendering. */
  fallback: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
  /** Changing this key clears the error (e.g. navigating to another lesson). */
  resetKey?: string;
}

interface State {
  error: Error | null;
  resetKey?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  reset = () => this.setState({ error: null });

  render() {
    return this.state.error
      ? this.props.fallback(this.state.error, this.reset)
      : this.props.children;
  }
}
