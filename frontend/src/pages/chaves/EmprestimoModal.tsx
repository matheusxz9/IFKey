import { useEffect, useState } from "react";
import { criarEmprestimo } from "../../services/emprestimos";
import {
  buscarSolicitante as buscarSolicitantePorId,
  buscarSolicitantePorMatricula,
} from "../../services/solicitantes";
import type { Chave } from "../../types/chave";
import type { Solicitante } from "../../types/solicitante";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import Modal from "../../components/Modal";
import { Alerta } from "../../components/ui/Alerta";
import { Botao } from "../../components/ui/Botao";
import { AreaTexto, Campo, Entrada } from "../../components/ui/Campos";
import { codigoDoErro, mensagemDoErro } from "../../utils/erros";
import { formatarTipo } from "../../utils/formatacao";

interface EmprestimoModalProps {
  chave: Chave | null;
  onClose: () => void;
  onConfirmado: () => Promise<void>;
}

export default function EmprestimoModal({
  chave,
  onClose,
  onConfirmado,
}: EmprestimoModalProps) {
  const toast = useToast();
  const { user, isSolicitante } = useAuth();
  const [matricula, setMatricula] = useState("");
  const [solicitante, setSolicitante] = useState<Solicitante | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [buscandoSolicitante, setBuscandoSolicitante] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");

  async function carregarSolicitanteProprio() {
    if (!user) return;
    try {
      setBuscandoSolicitante(true);
      setErroModal("");
      const proprio = await buscarSolicitantePorId(user.id);
      setSolicitante(proprio);
    } catch (error) {
      setErroModal(
        mensagemDoErro(
          error,
          "Não foi possível carregar seus dados de solicitante.",
        ),
      );
    } finally {
      setBuscandoSolicitante(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!chave) return;
    setSolicitante(null);
    setObservacoes("");
    setErroModal("");
    if (isSolicitante && user) {
      setMatricula(user.perfil === "SOLICITANTE" ? user.matricula : "");
      void carregarSolicitanteProprio();
    } else {
      setMatricula("");
    }
  }, [chave?.id]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function resetarFormulario() {
    setMatricula("");
    setSolicitante(null);
    setObservacoes("");
    setErroModal("");
  }

  function fecharModal() {
    if (salvando) return;
    resetarFormulario();
    onClose();
  }

  async function buscarSolicitante() {
    if (!matricula.trim()) {
      setErroModal("Informe a matrícula do solicitante.");
      return;
    }
    try {
      setBuscandoSolicitante(true);
      setErroModal("");
      setSolicitante(null);
      const encontrado = await buscarSolicitantePorMatricula(matricula.trim());
      setSolicitante(encontrado);
    } catch (error) {
      setErroModal(mensagemDoErro(error, "Erro ao buscar o solicitante."));
    } finally {
      setBuscandoSolicitante(false);
    }
  }

  async function confirmarEmprestimo() {
    if (!chave || !solicitante) return;
    try {
      setSalvando(true);
      setErroModal("");
      await criarEmprestimo({
        solicitanteId: solicitante.id,
        chaveId: chave.id,
        observacoes: observacoes.trim() || undefined,
      });
      resetarFormulario();
      onClose();
      toast.success("Empréstimo registrado com sucesso!");
      await onConfirmado();
    } catch (error) {
      if (codigoDoErro(error) === "CHAVE_INDISPONIVEL") {
        setErroModal(
          "Essa chave acabou de ser emprestada. Atualize a lista e tente novamente.",
        );
      } else {
        setErroModal(
          mensagemDoErro(error, "Não foi possível realizar o empréstimo."),
        );
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto={!!chave}
      onClose={fecharModal}
      titulo="Registrar empréstimo"
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-linha bg-superficie-alta px-4 py-3">
          <p className="text-xs text-texto-fraco">Chave selecionada</p>
          <p className="mt-1 font-mono text-[0.8125rem] font-medium text-texto">
            {chave?.codigo}
          </p>
          <p className="text-sm text-texto-medio">{chave?.descricao}</p>
          <p className="mt-1 text-xs text-texto-fraco">{chave?.localizacao}</p>
        </div>

        {isSolicitante ? (
          <div className="rounded-lg border border-verde/25 bg-veu-verde px-4 py-3">
            <p className="text-xs text-texto-fraco">Solicitante</p>
            {solicitante ? (
              <>
                <p className="mt-1 font-medium text-texto">{solicitante.nome}</p>
                <p className="text-sm text-texto-medio">
                  Matrícula: {solicitante.matricula}
                </p>
                <p className="text-sm text-texto-medio">
                  Tipo: {formatarTipo(solicitante.tipo)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-texto-medio">
                O empréstimo será registrado para você mesmo.
              </p>
            )}
          </div>
        ) : (
          <Campo label="Matrícula do solicitante" htmlFor="matricula">
            <div className="flex gap-2.5">
              <Entrada
                id="matricula"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void buscarSolicitante();
                }}
                placeholder="Digite a matrícula"
                className="min-w-0 flex-1"
              />
              <Botao
                variante="secundario"
                onClick={() => void buscarSolicitante()}
                carregando={buscandoSolicitante}
              >
                {buscandoSolicitante ? "Buscando..." : "Buscar"}
              </Botao>
            </div>
          </Campo>
        )}

        {solicitante && !isSolicitante && (
          <div className="rounded-lg border border-verde/25 bg-veu-verde px-4 py-3">
            <p className="text-xs text-texto-fraco">Solicitante</p>
            <p className="mt-1 font-medium text-texto">{solicitante.nome}</p>
            <p className="text-sm text-texto-medio">
              Matrícula: {solicitante.matricula}
            </p>
            <p className="text-sm text-texto-medio">
              Tipo: {formatarTipo(solicitante.tipo)}
            </p>
          </div>
        )}

        <Campo label="Observações" htmlFor="observacoes" dica="Opcional.">
          <AreaTexto
            id="observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Observações sobre o empréstimo (opcional)"
            rows={3}
          />
        </Campo>

        {erroModal && <Alerta>{erroModal}</Alerta>}

        <div className="flex flex-wrap justify-end gap-2.5 pt-0.5">
          <Botao
            variante="secundario"
            onClick={fecharModal}
            disabled={salvando}
          >
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            onClick={() => void confirmarEmprestimo()}
            disabled={salvando || !solicitante}
          >
            {salvando ? "Registrando..." : "Confirmar empréstimo"}
          </Botao>
        </div>
      </div>
    </Modal>
  );
}
