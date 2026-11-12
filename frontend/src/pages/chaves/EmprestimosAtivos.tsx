import { useImperativeHandle, useState, type Ref } from "react";
import { devolverEmprestimo } from "../../services/emprestimos";
import type { Emprestimo } from "../../types/emprestimo";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import ConfirmDialog from "../../components/ConfirmDialog";
import RepassarEmprestimoModal from "../../components/RepassarEmprestimoModal";
import DataTable, { type Coluna } from "../../components/DataTable";
import { Alerta } from "../../components/ui/Alerta";
import { Botao } from "../../components/ui/Botao";
import { Cartao, Contagem } from "../../components/ui/Cartao";
import { Selo } from "../../components/ui/Selo";
import { pluralizar } from "../../utils/formatacao";

export interface EmprestimosAtivosHandle {
  solicitarDevolucao: (emprestimo: Emprestimo) => void;
}

interface EmprestimosAtivosProps {
  emprestimos: Emprestimo[];
  carregando: boolean;
  erro: string;
  onAtualizar: () => Promise<void>;
  ref?: Ref<EmprestimosAtivosHandle>;
}

export default function EmprestimosAtivos({
  emprestimos,
  carregando,
  erro,
  onAtualizar,
  ref,
}: EmprestimosAtivosProps) {
  const toast = useToast();
  const { user, isSolicitante } = useAuth();
  const [emprestimoSelecionado, setEmprestimoSelecionado] =
    useState<Emprestimo | null>(null);
  const [emprestimoParaRepasse, setEmprestimoParaRepasse] =
    useState<Emprestimo | null>(null);
  const [devolvendo, setDevolvendo] = useState(false);

  useImperativeHandle(ref, () => ({
    solicitarDevolucao: (emprestimo) => setEmprestimoSelecionado(emprestimo),
  }));

  const ehResponsavelAtual = (emprestimo: Emprestimo) =>
    !isSolicitante || emprestimo.responsavelAtual.id === user?.id;

  const podeRepassar = (emprestimo: Emprestimo) =>
    isSolicitante && emprestimo.responsavelAtual.id === user?.id;

  async function confirmarDevolucao() {
    if (!emprestimoSelecionado) return;
    try {
      setDevolvendo(true);
      await devolverEmprestimo(emprestimoSelecionado.id);
      toast.success("Devolução registrada com sucesso!");
      setEmprestimoSelecionado(null);
      await onAtualizar();
    } catch {
      toast.error("Erro ao registrar a devolução. Tente novamente.");
    } finally {
      setDevolvendo(false);
    }
  }

  const colunas: Coluna<Emprestimo>[] = [
    {
      key: "chave",
      titulo: "Chave",
      render: (e) => (
        <>
          <p className="font-mono text-[0.8125rem] font-medium text-texto">
            {e.chave.codigo}
          </p>
          <p className="mt-0.5 text-sm text-texto-fraco">{e.chave.descricao}</p>
        </>
      ),
    },
    {
      key: "solicitante",
      titulo: "Solicitante",
      render: (e) => e.solicitante.nome,
    },
    {
      key: "responsavelAtual",
      titulo: "Responsável atual",
      render: (e) => (
        <>
          <p className="font-medium text-texto">{e.responsavelAtual.nome}</p>
          <p className="mt-0.5 font-mono text-xs text-texto-fraco">
            {e.responsavelAtual.matricula}
          </p>
          {e.responsavelAtual.id !== e.solicitante.id && (
            <Selo variante="repassada" className="mt-1">
              Repassada
            </Selo>
          )}
        </>
      ),
    },
    {
      key: "acoes",
      titulo: "Ação",
      acoes: true,
      render: (e) => (
        <div className="flex flex-wrap gap-2">
          {ehResponsavelAtual(e) && (
            <Botao
              tamanho="sm"
              variante="secundario"
              aria-label={`Devolver chave ${e.chave.codigo}`}
              onClick={() => setEmprestimoSelecionado(e)}
            >
              Devolver
            </Botao>
          )}
          {podeRepassar(e) && (
            <Botao
              tamanho="sm"
              aria-label={`Repassar chave ${e.chave.codigo}`}
              onClick={() => setEmprestimoParaRepasse(e)}
            >
              Repassar
            </Botao>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Cartao
        semRecuo
        titulo="Empréstimos ativos"
        subtitulo="Chaves que estão atualmente emprestadas."
        acao={
          <Contagem>
            {pluralizar(emprestimos.length, "empréstimo", "empréstimos")}
          </Contagem>
        }
      >
        {erro && (
          <div className="border-b border-linha p-4">
            <Alerta>{erro}</Alerta>
          </div>
        )}

        <DataTable
          colunas={colunas}
          dados={emprestimos}
          carregando={carregando}
          mensagemVazia="Nenhuma chave emprestada no momento."
          dicaVazia="Todas as chaves estão disponíveis."
        />
      </Cartao>

      <ConfirmDialog
        aberto={!!emprestimoSelecionado}
        onClose={() => {
          if (!devolvendo) setEmprestimoSelecionado(null);
        }}
        onConfirmar={confirmarDevolucao}
        titulo="Confirmar devolução"
        mensagem={`Deseja devolver a chave ${emprestimoSelecionado?.chave.codigo}?`}
        textoConfirmar="Confirmar devolução"
        carregando={devolvendo}
        variante="warning"
      />

      <RepassarEmprestimoModal
        emprestimo={emprestimoParaRepasse}
        aberto={!!emprestimoParaRepasse}
        onClose={() => setEmprestimoParaRepasse(null)}
        onRepassado={async () => {
          await onAtualizar();
        }}
      />
    </>
  );
}
