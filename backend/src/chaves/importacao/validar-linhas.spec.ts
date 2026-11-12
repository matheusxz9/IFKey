import { validarLinhasChaves } from './validar-linhas';

describe('validarLinhasChaves', () => {
  it('não reserva o código quando a primeira ocorrência é inválida', () => {
    const linhas = validarLinhasChaves(
      [
        {
          linha: 2,
          valores: { codigo: 'ABC', descricao: '', localizacao: 'A' },
        },
        {
          linha: 3,
          valores: { codigo: 'abc', descricao: 'B', localizacao: 'B' },
        },
      ],
      { codigosExistentes: new Set() },
    );
    expect(linhas.map((linha) => linha.status)).toEqual(['ERRO', 'NOVO']);
  });

  it('classifica código existente e repetido sem distinção de caixa', () => {
    const linhas = validarLinhasChaves(
      [
        {
          linha: 2,
          valores: {
            codigo: ' lab-1 ',
            descricao: ' Laboratório ',
            localizacao: ' B ',
          },
        },
        {
          linha: 3,
          valores: { codigo: 'LAB-1', descricao: 'Outra', localizacao: 'C' },
        },
        {
          linha: 4,
          valores: { codigo: 'X', descricao: 'Sala', localizacao: 'D' },
        },
      ],
      { codigosExistentes: new Set(['x']) },
    );
    expect(linhas.map((linha) => linha.status)).toEqual([
      'NOVO',
      'DUPLICADO',
      'DUPLICADO',
    ]);
    expect(linhas[0].dados).toEqual({
      codigo: 'lab-1',
      descricao: 'Laboratório',
      localizacao: 'B',
    });
  });
});
