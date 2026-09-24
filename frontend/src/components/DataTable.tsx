import type { ReactNode } from "react";

export interface Coluna<T> {
  key: string;
  titulo: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  colunas: Coluna<T>[];
  dados: T[];
  carregando: boolean;
  mensagemVazia?: string;
  chaveId?: keyof T;
}

export default function DataTable<T extends object>({
  colunas,
  dados,
  carregando,
  mensagemVazia = "Nenhum registro encontrado.",
  chaveId = "id" as keyof T,
}: DataTableProps<T>) {
  if (carregando) {
    return (
      <div className="p-8 text-center text-gray-400" role="status">
        Carregando...
      </div>
    );
  }

  if (dados.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">{mensagemVazia}</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-gray-800 bg-gray-950">
          <tr>
            {colunas.map((coluna) => (
              <th
                key={coluna.key}
                scope="col"
                className="px-6 py-4 text-left text-sm font-semibold"
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
              className="border-b border-gray-800 last:border-0"
            >
              {colunas.map((coluna) => (
                <td key={coluna.key} className="px-6 py-4">
                  {coluna.render
                    ? coluna.render(item)
                    : String((item as Record<string, unknown>)[coluna.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
