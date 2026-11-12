import type { ReactNode } from "react";
import { cn } from "../utils/classes";
import { EstadoVazio, EsqueletoLinhas } from "./ui/Estado";

interface ColunaBase {
  titulo: string;
  /** Identificadores (código, matrícula, login e datas) usam a fonte mono. */
  mono?: boolean;
  /** Coluna de ações: na ficha do mobile ocupa a linha inteira. */
  acoes?: boolean;
}

type ColunaComCampo<T> = ColunaBase & {
  key: Extract<keyof T, string>;
  render?: undefined;
};

type ColunaComRender<T> = ColunaBase & {
  key: string;
  render: (item: T) => ReactNode;
};

export type Coluna<T> = ColunaComCampo<T> | ColunaComRender<T>;

interface DataTableProps<T> {
  colunas: Coluna<T>[];
  dados: T[];
  carregando: boolean;
  mensagemVazia?: string;
  dicaVazia?: string;
  chaveId?: keyof T;
}

export default function DataTable<T extends object>({
  colunas,
  dados,
  carregando,
  mensagemVazia = "Nenhum registro encontrado.",
  dicaVazia,
  chaveId = "id" as keyof T,
}: DataTableProps<T>) {
  if (carregando) {
    return (
      <div role="status">
        <span className="sr-only">Carregando...</span>
        <EsqueletoLinhas linhas={Math.min(Math.max(dados.length, 4), 6)} />
      </div>
    );
  }

  if (dados.length === 0) {
    return (
      <div role="status">
        <EstadoVazio mensagem={mensagemVazia} dica={dicaVazia} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="tabela-responsiva w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-linha bg-superficie-alta/50">
            {colunas.map((coluna) => (
              <th
                key={coluna.key}
                scope="col"
                className="px-5 py-3 text-left text-xs font-semibold text-texto-fraco"
              >
                {coluna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((item) => (
            <tr
              key={String(item[chaveId])}
              className="border-b border-linha/70 transition-colors last:border-0 hover:bg-superficie-ativa/50"
            >
              {colunas.map((coluna) => (
                <td
                  key={coluna.key}
                  data-rotulo={coluna.titulo}
                  data-acoes={coluna.acoes ? "" : undefined}
                  className={cn(
                    "px-5 py-3.5 align-middle text-texto",
                    coluna.mono &&
                      "font-mono text-[0.8125rem] tracking-tight whitespace-nowrap text-texto-medio",
                  )}
                >
                  {coluna.render
                    ? coluna.render(item)
                    : String(item[coluna.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
