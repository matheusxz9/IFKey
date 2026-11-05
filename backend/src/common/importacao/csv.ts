import { parse } from 'csv-parse/sync';
import { ImportacaoInvalidaException } from '../exceptions/app.exception';

export const LIMITE_BYTES_IMPORTACAO = 2 * 1024 * 1024;
export const LIMITE_LINHAS_IMPORTACAO = 5000;

export interface ArquivoCsv {
  originalname?: string;
  mimetype?: string;
  size: number;
  buffer: Buffer;
}

export interface ColunaCsv {
  nome: string;
  aliases: string[];
  obrigatoria: boolean;
}

export interface RegistroCsv {
  linha: number;
  valores: Record<string, string>;
  erro?: string;
}

export function normalizarCabecalho(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function detectarDelimitador(primeiraLinha: string): ',' | ';' {
  const pontoVirgula = (primeiraLinha.match(/;/g) ?? []).length;
  const virgula = (primeiraLinha.match(/,/g) ?? []).length;
  return virgula > pontoVirgula ? ',' : ';';
}

export function lerCsv(
  arquivo: ArquivoCsv,
  colunas: ColunaCsv[],
): RegistroCsv[] {
  if (!arquivo?.buffer || arquivo.size === 0 || arquivo.buffer.length === 0) {
    throw new ImportacaoInvalidaException('Arquivo CSV não informado.');
  }
  if (
    arquivo.size > LIMITE_BYTES_IMPORTACAO ||
    arquivo.buffer.length > LIMITE_BYTES_IMPORTACAO
  ) {
    throw new ImportacaoInvalidaException(
      'O arquivo CSV deve ter no máximo 2 MB.',
    );
  }

  let texto: string;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(arquivo.buffer);
  } catch {
    throw new ImportacaoInvalidaException(
      'O arquivo CSV deve estar codificado em UTF-8.',
    );
  }
  if (!texto.trim()) {
    throw new ImportacaoInvalidaException('Arquivo CSV vazio.');
  }

  const primeiraLinha = texto.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = detectarDelimitador(primeiraLinha);

  let registrosBrutos: { record: string[]; info: { lines: number } }[];
  try {
    registrosBrutos = parse(texto, {
      bom: true,
      delimiter,
      trim: true,
      skip_empty_lines: false,
      relax_column_count: true,
      info: true,
    }) as unknown as { record: string[]; info: { lines: number } }[];
  } catch {
    throw new ImportacaoInvalidaException(
      'Arquivo CSV inválido. Verifique as aspas e o delimitador.',
    );
  }

  const indiceCabecalho = registrosBrutos.findIndex((registro) =>
    registro.record.some((valor) => valor.trim() !== ''),
  );
  if (indiceCabecalho < 0) {
    throw new ImportacaoInvalidaException('Cabeçalho do CSV não encontrado.');
  }

  const cabecalho = registrosBrutos[indiceCabecalho];
  const mapa = mapearCabecalho(cabecalho.record, colunas);
  const registros: RegistroCsv[] = [];

  for (
    let indice = indiceCabecalho + 1;
    indice < registrosBrutos.length;
    indice += 1
  ) {
    const bruto = registrosBrutos[indice];
    const valores = bruto.record;
    if (valores.every((valor) => valor.trim() === '')) continue;

    const linha = indice === 0 ? 1 : registrosBrutos[indice - 1].info.lines + 1;
    const dados: Record<string, string> = {};
    for (const coluna of colunas) {
      const posicao = mapa.get(coluna.nome);
      dados[coluna.nome] =
        posicao === undefined ? '' : (valores[posicao] ?? '');
    }

    registros.push({
      linha,
      valores: dados,
      ...(valores.length > cabecalho.record.length
        ? { erro: 'A linha possui mais valores que o cabeçalho.' }
        : {}),
    });

    if (registros.length > LIMITE_LINHAS_IMPORTACAO) {
      throw new ImportacaoInvalidaException(
        'O arquivo CSV deve ter no máximo 5.000 registros.',
      );
    }
  }

  return registros;
}

function mapearCabecalho(
  cabecalho: string[],
  colunas: ColunaCsv[],
): Map<string, number> {
  const aliases = new Map<string, string>();
  for (const coluna of colunas) {
    for (const alias of coluna.aliases) {
      aliases.set(normalizarCabecalho(alias), coluna.nome);
    }
  }

  const mapa = new Map<string, number>();
  for (let indice = 0; indice < cabecalho.length; indice += 1) {
    const nome = aliases.get(normalizarCabecalho(cabecalho[indice]));
    if (!nome) continue;
    if (mapa.has(nome)) {
      throw new ImportacaoInvalidaException(
        `O cabeçalho possui a coluna "${nome}" repetida.`,
      );
    }
    mapa.set(nome, indice);
  }

  const faltantes = colunas
    .filter((coluna) => coluna.obrigatoria && !mapa.has(coluna.nome))
    .map((coluna) => coluna.nome);
  if (faltantes.length > 0) {
    throw new ImportacaoInvalidaException(
      `O cabeçalho deve conter a(s) coluna(s): ${faltantes.join(', ')}.`,
    );
  }

  return mapa;
}
