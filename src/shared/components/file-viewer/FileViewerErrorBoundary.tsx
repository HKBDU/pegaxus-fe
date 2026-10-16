import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; message: string }
type State = { hasError: boolean }

export class FileViewerErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('File viewer error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-32 w-full items-center justify-center rounded-lg border bg-background p-4 text-center text-sm text-destructive">
          {this.props.message}
        </div>
      )
    }

    return this.props.children
  }
}
