import { Component, type ErrorInfo, type ReactNode } from "react";

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
        <div className="p-8 text-center">
          <p className="mb-4 text-gray-400">
            Não foi possível carregar esta página.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-green-700 px-5 py-2 font-semibold text-white hover:bg-green-800 cursor-pointer"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
