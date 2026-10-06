import { reportError } from '@/services/platform/errors'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from '@/components/ui'

interface Props {
  children: ReactNode
  resetKey?: string
}

interface State {
  error: Error | null
}

/** Catches render errors per route so one failing page never blanks the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, info.componentStack?.split('\n').filter(Boolean)[0]?.trim() ?? 'render')
    if (import.meta.env.DEV) console.error('ANIVIA render error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container-app py-16">
          <ErrorState onRetry={() => this.setState({ error: null })} />
        </div>
      )
    }
    return this.props.children
  }
}
