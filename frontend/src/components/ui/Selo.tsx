import type { ReactNode } from "react";
import { cn } from "../../utils/classes";

/**
 * Rótulo compacto para estados e classificações (status da chave, situação do
 * cadastro, perfil, tipo de solicitante). O ponto colorido reforça o estado
 * sem depender apenas da cor do texto.
 */
export type VarianteSelo =
  | "disponivel"
  | "emprestada"
  | "andamento"
  | "devolvida"
  | "ativo"
  | "inativo"
  | "administrador"
  | "gestor"
  | "solicitante"
  | "aluno"
  | "professor"
  | "servidor";

const variantes: Record<VarianteSelo, string> = {
  disponivel: "border-verde/30 bg-veu-verde text-verde-claro",
  emprestada: "border-ambar/30 bg-veu-ambar text-ambar",
  andamento: "border-ambar/30 bg-veu-ambar text-ambar",
  devolvida: "border-linha-forte/60 bg-veu-cinza text-texto-medio",
  ativo: "border-verde/30 bg-veu-verde text-verde-claro",
  inativo: "border-linha-forte/60 bg-veu-cinza text-texto-medio",
  administrador: "border-roxo/30 bg-veu-roxo text-roxo",
  gestor: "border-azul/30 bg-veu-azul text-azul",
  solicitante: "border-verde/30 bg-veu-verde text-verde-claro",
  aluno: "border-azul/30 bg-veu-azul text-azul",
  professor: "border-roxo/30 bg-veu-roxo text-roxo",
  servidor: "border-ambar/30 bg-veu-ambar text-ambar",
};

const comPonto: VarianteSelo[] = [
  "disponivel",
  "emprestada",
  "andamento",
  "devolvida",
  "ativo",
  "inativo",
];

interface SeloProps {
  variante: VarianteSelo;
  children: ReactNode;
  className?: string;
}

export function Selo({ variante, children, className }: SeloProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        variantes[variante],
        className,
      )}
    >
      {comPonto.includes(variante) && (
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}
