import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from './ui/button'
import { MotionCard } from './ui/motion'

interface Props {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, errorInfo?: ErrorInfo) => ReactNode)
  onError?: (error: Error, errorInfo?: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

/**
 * Standard Error Boundary for catching React render/lifecycle errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo })

    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo)
    }

    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  renderFallback() {
    const { fallback } = this.props
    const { error, errorInfo } = this.state

    if (typeof fallback === 'function') {
      return fallback(error!, errorInfo)
    }

    if (fallback) return fallback

    return (
      <div className="min-h-screen bg-glass-gradient flex items-center justify-center p-6">
        <MotionCard
          className="glass-card w-full max-w-md p-8 text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="text-muted-foreground text-sm">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <div className="text-left bg-destructive/5 rounded-lg p-4 max-h-40 overflow-auto">
              <p className="text-xs text-destructive font-mono">
                {error.toString()}
              </p>
              {errorInfo && (
                <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button
              onClick={this.handleReset}
              variant="outline"
              className="glass-input border-glass-border"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={this.handleGoHome} className="glass-button">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </MotionCard>
      </div>
    )
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback()
    }

    return this.props.children
  }
}

/**
 * Async Error Boundary – handles unhandled Promise rejections globally
 */
let globalListenerAttached = false

export class AsyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  componentDidMount() {
    if (!globalListenerAttached) {
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
      globalListenerAttached = true
    }
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
    globalListenerAttached = false
  }

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason || 'Unhandled promise rejection'))

    console.error('Unhandled promise rejection:', reason)

    this.setState({ hasError: true, error: reason })
    this.props.onError?.(reason, { componentStack: 'Unhandled Promise Rejection' } as ErrorInfo)
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo })
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundary
          fallback={this.props.fallback}
          onError={this.props.onError}
        >
          {this.props.children}
        </ErrorBoundary>
      )
    }

    return this.props.children
  }
}

/**
 * HOC to wrap any component with an Error Boundary
 */
export function withErrorBoundary<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  fallback?: Props['fallback']
) {
  function ComponentWithErrorBoundary(props: T) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }

  ComponentWithErrorBoundary.displayName = `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`

  return ComponentWithErrorBoundary
}
