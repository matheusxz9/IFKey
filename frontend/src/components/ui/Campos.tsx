import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../utils/classes";
import { Icone } from "./Icone";

const baseCampo =
  "w-full rounded-lg border border-linha-campo/60 bg-superficie-alta px-3.5 py-2.5 text-sm text-texto transition-colors placeholder:text-texto-fraco/70 hover:border-linha-campo focus:border-verde focus:ring-2 focus:ring-verde/25 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

export function Entrada({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(baseCampo, className)} {...props} />;
}

export function Selecao({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(baseCampo, "campo-selecao cursor-pointer", className)}
      {...props}
    />
  );
}

export function AreaTexto({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(baseCampo, "resize-y", className)} {...props} />;
}

interface EntradaBuscaProps extends ComponentProps<"input"> {
  /** Rótulo acessível do campo (os testes e leitores de tela usam o rótulo). */
  rotulo: string;
  classNameWrapper?: string;
}

/** Campo de busca com ícone; ocupa o espaço livre da barra de filtros. */
export function EntradaBusca({
  rotulo,
  className,
  classNameWrapper,
  ...props
}: EntradaBuscaProps) {
  return (
    <div className={cn("relative min-w-0 flex-1", classNameWrapper)}>
      <Icone
        nome="buscar"
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-texto-fraco"
      />
      <input
        type="search"
        aria-label={rotulo}
        className={cn(baseCampo, "pl-10", className)}
        {...props}
      />
    </div>
  );
}

interface CampoProps {
  label: string;
  htmlFor: string;
  /** Texto auxiliar abaixo do controle. */
  dica?: string;
  children: ReactNode;
}

/** Rótulo + controle + dica, no mesmo ritmo vertical dos formulários. */
export function Campo({ label, htmlFor, dica, children }: CampoProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-texto-medio"
      >
        {label}
      </label>
      {children}
      {dica && <p className="mt-1.5 text-xs text-texto-fraco">{dica}</p>}
    </div>
  );
}
