export const transformarTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const transformarBooleano = ({ value }: { value: unknown }) =>
  value === 'true';
