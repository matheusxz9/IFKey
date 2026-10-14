import type { ReactNode } from "react";

interface PageHeaderProps {
  titulo: string;
  subtitulo?: string;
  children?: ReactNode;
}

export default function PageHeader({
  titulo,
  subtitulo,
  children,
}: PageHeaderProps) {
  return (
    <header className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">{titulo}</h1>
        {subtitulo && (
          <p className="mt-2 text-gray-400">{subtitulo}</p>
        )}
      </div>
      {children && <div>{children}</div>}
    </header>
  );
}
