type ValorQuery = string | number | boolean | null | undefined;

export function montarQueryString(params: Record<string, ValorQuery>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null || valor === "") return;
    query.set(chave, String(valor));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}
