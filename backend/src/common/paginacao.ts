export function calcularSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function montarMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
