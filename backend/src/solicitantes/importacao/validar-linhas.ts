import type { ColunaCsv, RegistroCsv } from '../../common/importacao/csv';
import type {
  LinhaPrevia,
  MensagemImportacao,
} from '../../common/importacao/importacao.types';
import { TipoSolicitante } from '../../common/enums/tipo-solicitante.enum';

export interface DadosImportacaoSolicitante {
  nome: string;
  tipo: TipoSolicitante;
  matricula: string;
  contato: string | null;
}

export interface ContextoValidacaoSolicitantes {
  matriculasExistentes: Map<string, boolean>;
  loginsAdministradores: Set<string>;
}

export const COLUNAS_CSV_SOLICITANTES: ColunaCsv[] = [
  { nome: 'nome', aliases: ['nome'], obrigatoria: true },
  { nome: 'tipo', aliases: ['tipo'], obrigatoria: true },
  { nome: 'matricula', aliases: ['matricula'], obrigatoria: true },
  {
    nome: 'contato',
    aliases: ['contato', 'email', 'e-mail'],
    obrigatoria: false,
  },
];

export function validarLinhasSolicitantes(
  registros: RegistroCsv[],
  contexto: ContextoValidacaoSolicitantes,
): LinhaPrevia<DadosImportacaoSolicitante>[] {
  const vistos = new Map<string, number>();
  const linhas: LinhaPrevia<DadosImportacaoSolicitante>[] = [];

  for (const registro of registros) {
    const nome = (registro.valores.nome ?? '').trim();
    const tipo = (registro.valores.tipo ?? '').trim().toUpperCase();
    const matricula = (registro.valores.matricula ?? '').trim();
    const contato = (registro.valores.contato ?? '').trim();

    const mensagens: MensagemImportacao[] = [];
    if (registro.erro) {
      mensagens.push({ mensagem: registro.erro });
    }
    if (!nome) {
      mensagens.push({ campo: 'nome', mensagem: 'Nome é obrigatório.' });
    }
    if (!tipo) {
      mensagens.push({ campo: 'tipo', mensagem: 'Tipo é obrigatório.' });
    } else if (
      !Object.values(TipoSolicitante).includes(tipo as TipoSolicitante)
    ) {
      mensagens.push({
        campo: 'tipo',
        mensagem: 'tipo deve ser ALUNO, PROFESSOR ou SERVIDOR.',
      });
    }
    if (!matricula) {
      mensagens.push({
        campo: 'matricula',
        mensagem: 'Matrícula é obrigatória.',
      });
    }
    if (nome.length > 120) {
      mensagens.push({
        campo: 'nome',
        mensagem: 'Nome deve ter no máximo 120 caracteres.',
      });
    }
    if (matricula.length > 30) {
      mensagens.push({
        campo: 'matricula',
        mensagem: 'Matrícula deve ter no máximo 30 caracteres.',
      });
    }
    if (contato.length > 120) {
      mensagens.push({
        campo: 'contato',
        mensagem: 'Contato deve ter no máximo 120 caracteres.',
      });
    }

    const dados: DadosImportacaoSolicitante = {
      nome,
      tipo: tipo as TipoSolicitante,
      matricula,
      contato: contato || null,
    };

    if (mensagens.length > 0) {
      linhas.push({ linha: registro.linha, dados, status: 'ERRO', mensagens });
      continue;
    }

    const chave = matricula.toLowerCase();
    const primeiraLinha = vistos.get(chave);
    if (primeiraLinha !== undefined) {
      linhas.push({
        linha: registro.linha,
        dados,
        status: 'DUPLICADO',
        mensagens: [
          {
            campo: 'matricula',
            mensagem: `Matrícula repetida no arquivo (linha ${primeiraLinha}).`,
          },
        ],
      });
      continue;
    }

    const ativo = contexto.matriculasExistentes.get(chave);
    if (ativo !== undefined) {
      linhas.push({
        linha: registro.linha,
        dados,
        status: 'DUPLICADO',
        mensagens: [
          {
            campo: 'matricula',
            mensagem: `Matrícula já cadastrada (cadastro ${ativo ? 'ativo' : 'inativo'}).`,
          },
        ],
      });
      continue;
    }

    if (contexto.loginsAdministradores.has(chave)) {
      linhas.push({
        linha: registro.linha,
        dados,
        status: 'ERRO',
        mensagens: [
          {
            campo: 'matricula',
            mensagem: 'Matrícula já pertence a um administrador cadastrado.',
          },
        ],
      });
      continue;
    }

    vistos.set(chave, registro.linha);
    linhas.push({
      linha: registro.linha,
      dados,
      status: 'NOVO',
      mensagens: [],
    });
  }

  return linhas;
}
