import type { ReactNode } from "react";

interface PageHeaderProps {
  titulo: string;
  subtitulo?: string;
  children?: ReactNode;
}

export default function PageHeader({ titulo, subtitulo, children }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight text-texto md:text-[1.75rem]">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="mt-1.5 max-w-[70ch] text-sm leading-relaxed text-texto-fraco">
            {subtitulo}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">{children}</div>
      )}
    </header>
  );
}
