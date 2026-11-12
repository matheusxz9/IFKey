import type { RegistroCsv } from '../../common/importacao/csv';
import {
  ContextoValidacaoSolicitantes,
  validarLinhasSolicitantes,
} from './validar-linhas';

const contexto = (
  over: Partial<ContextoValidacaoSolicitantes> = {},
): ContextoValidacaoSolicitantes => ({
  matriculasExistentes: new Map<string, boolean>(),
  loginsAdministradores: new Set<string>(),
  ...over,
});

const registro = (
  linha: number,
  nome: string,
  tipo: string,
  matricula: string,
  contato = '',
): RegistroCsv => ({
  linha,
  valores: { nome, tipo, matricula, contato },
});

describe('validarLinhasSolicitantes', () => {
  it('normaliza tipo, apara valores e transforma contato vazio em null', () => {
    const [linha] = validarLinhasSolicitantes(
      [registro(2, ' Maria ', 'aluno', ' 123 ', '')],
      contexto(),
    );
    expect(linha).toMatchObject({
      status: 'NOVO',
      dados: { nome: 'Maria', tipo: 'ALUNO', matricula: '123', contato: null },
    });
  });

  it('marca campos obrigatórios, tipo inválido e limite de nome', () => {
    const linhas = validarLinhasSolicitantes(
      [
        registro(2, '', 'ALUNO', '1'),
        registro(3, 'Ana', 'ESTAGIARIO', '2'),
        registro(4, 'a'.repeat(121), 'ALUNO', '3'),
      ],
      contexto(),
    );
    expect(linhas.map((linha) => linha.status)).toEqual([
      'ERRO',
      'ERRO',
      'ERRO',
    ]);
    expect(linhas[0].mensagens).toContainEqual({
      campo: 'nome',
      mensagem: expect.any(String),
    });
  });

  it('ignora duplicata no arquivo e referencia a primeira linha válida', () => {
    const linhas = validarLinhasSolicitantes(
      [
        registro(2, 'Maria', 'ALUNO', 'ABC'),
        registro(3, 'Maria 2', 'ALUNO', 'abc'),
      ],
      contexto(),
    );
    expect(linhas[1].status).toBe('DUPLICADO');
    expect(linhas[1].mensagens[0].mensagem).toContain('linha 2');
  });

  it('não reserva o identificador quando a primeira ocorrência é inválida', () => {
    const linhas = validarLinhasSolicitantes(
      [
        registro(2, 'Maria', 'ESTAGIARIO', 'ABC'),
        registro(3, 'Maria 2', 'ALUNO', 'abc'),
      ],
      contexto(),
    );
    expect(linhas[0].status).toBe('ERRO');
    expect(linhas[1].status).toBe('NOVO');
  });

  it('ignora matrícula existente ativa ou inativa e reporta colisão com admin', () => {
    const linhas = validarLinhasSolicitantes(
      [
        registro(2, 'A', 'ALUNO', '111'),
        registro(3, 'B', 'ALUNO', '222'),
        registro(4, 'C', 'ALUNO', 'admin.teste'),
      ],
      contexto({
        matriculasExistentes: new Map([
          ['111', true],
          ['222', false],
        ]),
        loginsAdministradores: new Set(['admin.teste']),
      }),
    );
    expect(linhas[0].status).toBe('DUPLICADO');
    expect(linhas[0].mensagens[0].mensagem).toContain('ativo');
    expect(linhas[1].status).toBe('DUPLICADO');
    expect(linhas[1].mensagens[0].mensagem).toContain('inativo');
    expect(linhas[2].status).toBe('ERRO');
    expect(linhas[2].mensagens[0].mensagem).toBe(
      'Matrícula já pertence a um administrador cadastrado.',
    );
  });

  it('rejeita excesso de valores, matrícula longa e contato longo', () => {
    const linhas = validarLinhasSolicitantes(
      [
        { ...registro(2, 'A', 'ALUNO', '1'), erro: 'Valores extras.' },
        registro(3, 'B', 'ALUNO', '2'.repeat(31)),
        registro(4, 'C', 'SERVIDOR', '3', 'c'.repeat(121)),
      ],
      contexto(),
    );
    expect(linhas.map((linha) => linha.status)).toEqual([
      'ERRO',
      'ERRO',
      'ERRO',
    ]);
    expect(linhas[1].mensagens[0].campo).toBe('matricula');
    expect(linhas[2].mensagens[0].campo).toBe('contato');
  });
});
