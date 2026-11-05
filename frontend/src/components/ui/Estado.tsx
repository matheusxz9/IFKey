import { cn } from "../../utils/classes";
import { Icone } from "./Icone";

export function Girando({ className }: { className?: string }) {
  return <Icone nome="girando" className={cn("h-4 w-4 animate-spin", className)} />;
}

/** Tela cheia usada enquanto a sessão é verificada ou o login é concluído. */
export function TelaCarregando({ mensagem }: { mensagem: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-tela px-4 text-center">
      <Girando className="h-5 w-5 text-verde-claro" />
      <p role="status" className="text-sm text-texto-fraco">
        {mensagem}
      </p>
    </main>
  );
}

const larguras = ["92%", "74%", "85%", "66%", "88%", "78%"];

/** Esqueleto exibido durante o carregamento das listagens. */
export function EsqueletoLinhas({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="space-y-4 px-5 py-5" aria-hidden="true">
      {Array.from({ length: linhas }).map((_, indice) => (
        <div
          key={indice}
          className="h-3.5 animate-pulse rounded-full bg-superficie-ativa"
          style={{ width: larguras[indice % larguras.length] }}
        />
      ))}
    </div>
  );
}

/** Estado vazio de listagens: contexto, ícone e orientação. */
export function EstadoVazio({
  mensagem,
  dica,
}: {
  mensagem: string;
  dica?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-6 py-14 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-linha bg-superficie-alta text-texto-fraco">
        <Icone nome="caixa" className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-texto-medio">{mensagem}</p>
      {dica && <p className="max-w-sm text-sm text-texto-fraco">{dica}</p>}
    </div>
  );
}
