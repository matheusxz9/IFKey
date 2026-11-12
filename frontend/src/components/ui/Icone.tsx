import type { ReactNode, SVGProps } from "react";
import { cn } from "../../utils/classes";

/**
 * Conjunto de ícones em SVG inline (traço de 1,75px, grade de 24px) para não
 * adicionar dependência e manter o traço consistente entre as telas.
 */
export type NomeIcone =
  | "chave"
  | "relogio"
  | "gaveteiro"
  | "pessoas"
  | "escudo"
  | "menu"
  | "fechar"
  | "buscar"
  | "mais"
  | "sair"
  | "anterior"
  | "proximo"
  | "confirmado"
  | "alerta"
  | "erro"
  | "info"
  | "caixa"
  | "girando";

const desenhos: Record<NomeIcone, ReactNode> = {
  chave: (
    <>
      <circle cx="8" cy="8" r="3.75" />
      <path d="M10.65 10.65 20.5 20.5" />
      <path d="m15.9 15.9-2 2" />
      <path d="m18.9 18.9-2 2" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.25V12l3.25 2" />
    </>
  ),
  gaveteiro: (
    <>
      <rect x="3.5" y="3.75" width="17" height="7" rx="2" />
      <rect x="3.5" y="13.25" width="17" height="7" rx="2" />
      <path d="M10 7.25h4" />
      <path d="M10 16.75h4" />
    </>
  ),
  pessoas: (
    <>
      <circle cx="10" cy="8.25" r="3.5" />
      <path d="M4.5 19.25v-1.5a3.75 3.75 0 0 1 3.75-3.75h3.5a3.75 3.75 0 0 1 3.75 3.75v1.5" />
      <path d="M18.75 19.25v-1.5a3.75 3.75 0 0 0-2.6-3.55" />
      <path d="M15.4 4.9a3.5 3.5 0 0 1 0 6.7" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 3.5 19 6.1v5.4c0 4.3-2.85 7.35-7 9-4.15-1.65-7-4.7-7-9V6.1z" />
      <path d="m9.25 11.9 2 2 3.5-3.5" />
    </>
  ),
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  fechar: <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />,
  buscar: (
    <>
      <circle cx="10.75" cy="10.75" r="5.75" />
      <path d="m15 15 4.5 4.5" />
    </>
  ),
  mais: <path d="M12 5.5v13M5.5 12h13" />,
  sair: (
    <>
      <path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3" />
      <path d="M9.5 8 5.5 12l4 4" />
      <path d="M5.5 12h9" />
    </>
  ),
  anterior: <path d="m13.5 6.5-5.5 5.5 5.5 5.5" />,
  proximo: <path d="m10.5 6.5 5.5 5.5-5.5 5.5" />,
  confirmado: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alerta: (
    <>
      <path d="M12 4.5 20.25 19H3.75z" />
      <path d="M12 10v4" />
      <path d="M12 16.75h.01" />
    </>
  ),
  erro: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.25v5" />
      <path d="M12 7.75h.01" />
    </>
  ),
  caixa: (
    <>
      <path d="M4 13.75h4l1.4 2.5h5.2l1.4-2.5h4" />
      <path d="M6.6 5.5h10.8l2.6 8.25v3.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.5z" />
    </>
  ),
  girando: (
    <>
      <path d="M12 3.5v3.75" />
      <path d="M12 16.75v3.75" />
      <path d="M3.5 12h3.75" />
      <path d="M16.75 12h3.75" />
      <path d="m6 6 2.65 2.65" />
      <path d="m15.35 15.35 2.65 2.65" />
      <path d="m18 6-2.65 2.65" />
      <path d="m8.65 15.35 2.65 2.65" />
    </>
  ),
};

interface IconeProps extends SVGProps<SVGSVGElement> {
  nome: NomeIcone;
}

export function Icone({ nome, className, ...props }: IconeProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("h-4 w-4 shrink-0", className)}
      {...props}
    >
      {desenhos[nome]}
    </svg>
  );
}
