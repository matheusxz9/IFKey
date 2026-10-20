import type { ReactNode } from "react";
import { cn } from "../../utils/classes";
import { Icone, type NomeIcone } from "./Icone";

type VarianteAlerta = "erro" | "aviso" | "info" | "sucesso";

const variantes: Record<VarianteAlerta, { caixa: string; icone: NomeIcone }> = {
  erro: { caixa: "border-vermelho/30 bg-veu-vermelho text-vermelho", icone: "erro" },
  aviso: { caixa: "border-ambar/30 bg-veu-ambar text-ambar", icone: "alerta" },
  info: { caixa: "border-azul/30 bg-veu-azul text-azul", icone: "info" },
  sucesso: { caixa: "border-verde/30 bg-veu-verde text-verde-claro", icone: "confirmado" },
};

interface AlertaProps {
  variante?: VarianteAlerta;
  children: ReactNode;
  className?: string;
}

export function Alerta({ variante = "erro", children, className }: AlertaProps) {
  const estilo = variantes[variante];

  return (
    <div
      role={variante === "erro" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm",
        estilo.caixa,
        className,
      )}
    >
      <Icone nome={estilo.icone} className="mt-0.5 h-4 w-4" />
      <div className="min-w-0 leading-relaxed">{children}</div>
    </div>
  );
}
