import type { ReactNode } from "react";
import { cn } from "../../utils/classes";

interface CartaoProps {
  titulo?: string;
  subtitulo?: string;
  /** Conteúdo do lado direito do cabeçalho (contagens, ações, filtros). */
  acao?: ReactNode;
  /** Remove o recuo interno (listas e tabelas encostam nas bordas). */
  semRecuo?: boolean;
  className?: string;
  children: ReactNode;
}

/** Superfície padrão das seções: contorno de 1px, canto de 12px, sem sombra. */
export function Cartao({
  titulo,
  subtitulo,
  acao,
  semRecuo = false,
  className,
  children,
}: CartaoProps) {
  const temCabecalho = Boolean(titulo || subtitulo || acao);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-linha bg-superficie",
        className,
      )}
    >
      {temCabecalho && (
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-linha px-5 py-3.5">
          {(titulo || subtitulo) && (
            <div className="min-w-0">
              {titulo && (
                <h2 className="text-base leading-tight text-texto">{titulo}</h2>
              )}
              {subtitulo && (
                <p className="mt-1 text-sm leading-normal text-texto-fraco">
                  {subtitulo}
                </p>
              )}
            </div>
          )}
          {acao && <div className="flex shrink-0 items-center gap-3">{acao}</div>}
        </header>
      )}

      <div className={cn(!semRecuo && "p-5")}>{children}</div>
    </section>
  );
}

/** Contagem discreta para cabeçalhos de listagem. */
export function Contagem({ children }: { children: ReactNode }) {
  return <span className="text-sm text-texto-fraco">{children}</span>;
}
