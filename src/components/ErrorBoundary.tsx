import { AlertTriangle } from "lucide-react"
import { Component, ErrorInfo, ReactNode } from "react"

interface Props {
  children: ReactNode
  /** muda a cada navegação: a tela com erro volta ao normal ao trocar de página */
  resetKey?: string
}

interface State {
  error: Error | null
}

/**
 * Rede de segurança: um erro de renderização mostra um aviso no lugar da tela em vez de
 * desmontar o app inteiro (a janela ficava preta). Header e Sidebar continuam funcionando.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Symnager] erro na tela:", error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="m-auto max-w-md flex flex-col items-center gap-3 rounded-xl border border-line bg-surface p-6 text-center">
        <AlertTriangle size={22} className="text-warning" />
        <p className="text-sm font-semibold">Esta tela encontrou um erro</p>
        <p className="text-[13px] text-muted">Seus dados estão salvos. Tente abrir a tela de novo ou volte para outra página pelo menu.</p>
        <p className="text-xs font-mono text-faint break-all">{this.state.error.message}</p>
        <button
          onClick={() => this.setState({ error: null })}
          className="h-8 px-3 rounded-lg bg-surface border border-line shadow-sm text-[13px] font-medium hover:bg-hover transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    )
  }
}
