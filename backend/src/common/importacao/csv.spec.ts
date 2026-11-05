import { ImportacaoInvalidaException } from '../exceptions/app.exception';
import {
  ColunaCsv,
  detectarDelimitador,
  lerCsv,
  LIMITE_BYTES_IMPORTACAO,
  LIMITE_LINHAS_IMPORTACAO,
  normalizarCabecalho,
} from './csv';

const colunas: ColunaCsv[] = [
  { nome: 'nome', aliases: ['nome'], obrigatoria: true },
  { nome: 'matricula', aliases: ['matricula'], obrigatoria: true },
  {
    nome: 'contato',
    aliases: ['contato', 'email', 'e-mail'],
    obrigatoria: false,
  },
];

describe('normalizarCabecalho', () => {
  it('remove acentos, espaços e caixa', () => {
    expect(normalizarCabecalho('  Matrícula ')).toBe('matricula');
    expect(normalizarCabecalho('CÓDIGO')).toBe('codigo');
  });
});

describe('detectarDelimitador', () => {
  it('usa ponto e vírgula ou vírgula conforme o cabeçalho', () => {
    expect(detectarDelimitador('nome;tipo;matricula')).toBe(';');
    expect(detectarDelimitador('nome,tipo,matricula')).toBe(',');
    expect(detectarDelimitador('nome')).toBe(';');
  });
});

describe('lerCsv', () => {
  it('lê ; com BOM e normaliza aliases', () => {
    const csv = '\uFEFFNome;Matrícula;E-mail\nMaria;123;m@ifrn.br';
    const registros = lerCsv(
      { buffer: Buffer.from(csv), size: Buffer.byteLength(csv) },
      colunas,
    );
    expect(registros).toEqual([
      {
        linha: 2,
        valores: { nome: 'Maria', matricula: '123', contato: 'm@ifrn.br' },
      },
    ]);
  });

  it('lê , e aceita aspas com delimitador interno', () => {
    const csv = 'nome,matricula,contato\n"Maria; Silva",123,m@ifrn.br';
    const registros = lerCsv(
      { buffer: Buffer.from(csv), size: Buffer.byteLength(csv) },
      colunas,
    );
    expect(registros[0].valores.nome).toBe('Maria; Silva');
  });

  it('preserva a linha física com campo entre aspas e quebra interna', () => {
    const csv =
      'nome;matricula;contato\n"Maria\nSilva";123;m@ifrn.br\nJoao;456;';
    const registros = lerCsv(
      { buffer: Buffer.from(csv), size: Buffer.byteLength(csv) },
      colunas,
    );
    expect(registros.map((registro) => registro.linha)).toEqual([2, 4]);
  });

  it('ignora linhas vazias e sinaliza valores extras', () => {
    const csv = 'nome;matricula\nMaria;123\n\nJoao;456;extra';
    const registros = lerCsv(
      { buffer: Buffer.from(csv), size: Buffer.byteLength(csv) },
      colunas,
    );
    expect(registros).toHaveLength(2);
    expect(registros[1]).toMatchObject({
      linha: 4,
      erro: 'A linha possui mais valores que o cabeçalho.',
    });
  });

  it('libera arquivo apenas com cabeçalho', () => {
    const csv = 'nome;matricula;contato\n';
    expect(
      lerCsv(
        { buffer: Buffer.from(csv), size: Buffer.byteLength(csv) },
        colunas,
      ),
    ).toEqual([]);
  });

  it('rejeita cabeçalho ausente, incompleto ou com coluna canônica repetida', () => {
    expect(() =>
      lerCsv({ buffer: Buffer.from('nome;matricula\nMaria;123'), size: 20 }, [
        ...colunas,
        { nome: 'tipo', aliases: ['tipo'], obrigatoria: true },
      ]),
    ).toThrow(ImportacaoInvalidaException);

    expect(() =>
      lerCsv(
        {
          buffer: Buffer.from('nome;matricula;contato;email\nMaria;1;x;y'),
          size: 40,
        },
        colunas,
      ),
    ).toThrow(ImportacaoInvalidaException);
  });

  it('rejeita UTF-8 inválido, arquivo acima de 2 MB e mais de 5.000 linhas', () => {
    expect(() =>
      lerCsv({ buffer: Buffer.from([0xff, 0xfe]), size: 2 }, colunas),
    ).toThrow(ImportacaoInvalidaException);

    expect(() =>
      lerCsv(
        {
          buffer: Buffer.from('nome;matricula\n'),
          size: LIMITE_BYTES_IMPORTACAO + 1,
        },
        colunas,
      ),
    ).toThrow(ImportacaoInvalidaException);

    const muitas = `nome;matricula\n${Array.from(
      { length: LIMITE_LINHAS_IMPORTACAO + 1 },
      (_, indice) => `N${indice};${indice}`,
    ).join('\n')}`;
    expect(() =>
      lerCsv(
        { buffer: Buffer.from(muitas), size: Buffer.byteLength(muitas) },
        colunas,
      ),
    ).toThrow(ImportacaoInvalidaException);
  });
});
