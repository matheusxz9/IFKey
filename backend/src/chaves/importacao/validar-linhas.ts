import type { ColunaCsv, RegistroCsv } from '../../common/importacao/csv';
import type {
  LinhaPrevia,
  MensagemImportacao,
} from '../../common/importacao/importacao.types';

export interface DadosImportacaoChave {
  codigo: string;
  descricao: string;
  localizacao: string;
}

export interface ContextoValidacaoChaves {
  codigosExistentes: Set<string>;
}

export const COLUNAS_CSV_CHAVES: ColunaCsv[] = [
  { nome: 'codigo', aliases: ['codigo'], obrigatoria: true },
  { nome: 'descricao', aliases: ['descricao'], obrigatoria: true },
  { nome: 'localizacao', aliases: ['localizacao'], obrigatoria: true },
];

export function validarLinhasChaves(
  registros: RegistroCsv[],
  contexto: ContextoValidacaoChaves,
): LinhaPrevia<DadosImportacaoChave>[] {
  const vistos = new Map<string, number>();
  return registros.map((registro) => {
    const dados = {
      codigo: (registro.valores.codigo ?? '').trim(),
      descricao: (registro.valores.descricao ?? '').trim(),
      localizacao: (registro.valores.localizacao ?? '').trim(),
    };
    const mensagens: MensagemImportacao[] = [];
    if (registro.erro) mensagens.push({ mensagem: registro.erro });
    for (const campo of ['codigo', 'descricao', 'localizacao'] as const) {
      if (!dados[campo])
        mensagens.push({ campo, mensagem: `${campo} é obrigatório.` });
      const maximo = campo === 'codigo' ? 20 : 120;
      if (dados[campo].length > maximo) {
        mensagens.push({
          campo,
          mensagem: `${campo} deve ter no máximo ${maximo} caracteres.`,
        });
      }
    }
    if (mensagens.length)
      return { linha: registro.linha, dados, status: 'ERRO', mensagens };

    const codigo = dados.codigo.toLowerCase();
    const primeiraLinha = vistos.get(codigo);
    if (primeiraLinha !== undefined) {
      return {
        linha: registro.linha,
        dados,
        status: 'DUPLICADO',
        mensagens: [
          {
            campo: 'codigo',
            mensagem: `Código repetido no arquivo (linha ${primeiraLinha}).`,
          },
        ],
      };
    }
    if (contexto.codigosExistentes.has(codigo)) {
      return {
        linha: registro.linha,
        dados,
        status: 'DUPLICADO',
        mensagens: [{ campo: 'codigo', mensagem: 'Código já cadastrado.' }],
      };
    }
    vistos.set(codigo, registro.linha);
    return { linha: registro.linha, dados, status: 'NOVO', mensagens: [] };
  });
}
