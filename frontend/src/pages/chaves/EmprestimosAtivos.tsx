import { useImperativeHandle, useState, type Ref } from "react";
import { devolverEmprestimo } from "../../services/emprestimos";
import type { Emprestimo } from "../../types/emprestimo";
import { useToast } from "../../contexts/ToastContext";
import ConfirmDialog from "../../components/ConfirmDialog";
import DataTable, { type Coluna } from "../../components/DataTable";
import { Alerta } from "../../components/ui/Alerta";
import { Botao } from "../../components/ui/Botao";
import { Cartao, Contagem } from "../../components/ui/Cartao";
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
  const [emprestimoSelecionado, setEmprestimoSelecionado] =
    useState<Emprestimo | null>(null);
  const [devolvendo, setDevolvendo] = useState(false);

  useImperativeHandle(ref, () => ({
    solicitarDevolucao: (emprestimo) => setEmprestimoSelecionado(emprestimo),
  }));

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
      key: "matricula",
      titulo: "Matrícula",
      mono: true,
      render: (e) => e.solicitante.matricula,
    },
    {
      key: "devolver",
      titulo: "Ação",
      acoes: true,
      render: (e) => (
        <Botao
          tamanho="sm"
          variante="secundario"
          aria-label={`Devolver chave ${e.chave.codigo}`}
          onClick={() => setEmprestimoSelecionado(e)}
        >
          Devolver
        </Botao>
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
    </>
  );
}
