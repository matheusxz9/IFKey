import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/classes";
import { Icone } from "./Icone";

export type VarianteBotao =
  | "primario"
  | "secundario"
  | "sutil"
  | "perigo"
  | "aviso"
  | "sutil-perigo"
  | "sutil-verde"
  | "sutil-ambar";

type TamanhoBotao = "sm" | "md";

const variantes: Record<VarianteBotao, string> = {
  primario: "bg-verde text-tinta hover:bg-verde-vivo active:bg-verde",
  secundario:
    "border border-linha-forte bg-superficie-alta text-texto-medio hover:bg-superficie-ativa hover:text-texto",
  sutil: "text-texto-medio hover:bg-superficie-ativa hover:text-texto",
  perigo: "bg-vermelho text-[#230806] hover:brightness-110 active:brightness-100",
  aviso: "bg-ambar text-[#241a05] hover:brightness-110 active:brightness-100",
  "sutil-perigo": "text-vermelho hover:bg-veu-vermelho",
  "sutil-verde": "text-verde-claro hover:bg-veu-verde",
  "sutil-ambar": "text-ambar hover:bg-veu-ambar",
};

const tamanhos: Record<TamanhoBotao, string> = {
  sm: "gap-1.5 px-2.5 py-1.5 text-[0.8125rem]",
  md: "gap-2 px-4 py-2.5 text-sm",
};

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  carregando?: boolean;
  icone?: ReactNode;
}

export function Botao({
  variante = "secundario",
  tamanho = "md",
  carregando = false,
  icone,
  className,
  children,
  type = "button",
  disabled,
  ...props
}: BotaoProps) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-[background-color,color,filter,opacity] disabled:cursor-not-allowed disabled:opacity-45",
        variantes[variante],
        tamanhos[tamanho],
        className,
      )}
      {...props}
    >
      {carregando ? <Icone nome="girando" className="h-3.5 w-3.5 animate-spin" /> : icone}
      {children}
    </button>
  );
}
