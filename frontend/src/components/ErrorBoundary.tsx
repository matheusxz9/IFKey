import { Component, type ErrorInfo, type ReactNode } from "react";
import { Botao } from "./ui/Botao";
import { Icone } from "./ui/Icone";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  erro: boolean;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { erro: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { erro: true };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error("Erro ao renderizar a página:", erro, info.componentStack);
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-veu-vermelho bg-superficie px-6 py-12 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-vermelho/30 bg-veu-vermelho text-vermelho">
            <Icone nome="alerta" className="h-5 w-5" />
          </span>
          <p className="text-sm text-texto-medio">
            Não foi possível carregar esta página.
          </p>
          <Botao variante="primario" className="mt-1" onClick={() => window.location.reload()}>
            Recarregar
          </Botao>
        </div>
      );
    }

    return this.props.children;
  }
}
