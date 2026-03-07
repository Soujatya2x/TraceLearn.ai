'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  /** Optional label shown in the default fallback — e.g. "Error details" */
  label?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production you'd send this to Sentry / Datadog etc.
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-8 text-center">
        <AlertTriangle className="w-5 h-5 text-destructive/70" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {this.props.label
              ? `Failed to render ${this.props.label}`
              : 'Something went wrong'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
        </div>
        <button
          type="button"
          onClick={this.handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <RefreshCw className="w-3 h-3" aria-hidden="true" />
          Try again
        </button>
      </div>
    )
  }
}