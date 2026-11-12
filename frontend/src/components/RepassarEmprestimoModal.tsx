import { useEffect, useId, useState } from "react";
import Modal from "./Modal";
import { Alerta } from "./ui/Alerta";
import { Botao } from "./ui/Botao";
import { AreaTexto, Campo, Entrada } from "./ui/Campos";
import { Selo } from "./ui/Selo";
import { buscarSolicitantePorMatricula } from "../services/solicitantes";
import { repassarEmprestimo } from "../services/emprestimos";
import { useToast } from "../contexts/ToastContext";
import { formatarTipo } from "../utils/formatacao";
import type { Emprestimo } from "../types/emprestimo";
import type { Solicitante } from "../types/solicitante";

const varianteTipo = {
  ALUNO: "aluno",
  PROFESSOR: "professor",
  SERVIDOR: "servidor",
} as const;

interface Props {
  emprestimo: Emprestimo | null;
  aberto: boolean;
  onClose: () => void;
  onRepassado: () => void | Promise<void>;
}

export default function RepassarEmprestimoModal({
  emprestimo,
  aberto,
  onClose,
  onRepassado,
}: Props) {
  const toast = useToast();
  const idMatricula = useId();
  const idObservacoes = useId();

  const [matricula, setMatricula] = useState("");
  const [destino, setDestino] = useState<Solicitante | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!aberto) return;
    setMatricula("");
    setDestino(null);
    setObservacoes("");
    setErro("");
    setBuscando(false);
    setEnviando(false);
  }, [aberto]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function fechar() {
    if (enviando) return;
    onClose();
  }

  async function buscar() {
    if (!emprestimo) return;
    if (!matricula.trim()) {
      setErro("Informe a matrícula do novo responsável.");
      return;
    }
    setBuscando(true);
    setErro("");
    setDestino(null);
    try {
      const encontrado = await buscarSolicitantePorMatricula(matricula.trim());
      if (encontrado.id === emprestimo.responsavelAtual.id) {
        setErro("O novo responsável deve ser diferente do responsável atual.");
        return;
      }
      if (!encontrado.ativo) {
        setErro("Solicitante inativo não pode receber o repasse.");
        return;
      }
      setDestino(encontrado);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível buscar o solicitante.",
      );
    } finally {
      setBuscando(false);
    }
  }

  async function confirmar() {
    if (!emprestimo || !destino) return;
    setEnviando(true);
    setErro("");
    try {
      await repassarEmprestimo(emprestimo.id, {
        solicitanteId: destino.id,
        observacoes: observacoes.trim() || undefined,
      });
      toast.success("Responsabilidade repassada com sucesso!");
      await onRepassado();
      onClose();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível repassar a chave.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      onClose={fechar}
      titulo="Repassar responsabilidade"
    >
      <div className="space-y-4 text-sm text-texto">
        <p className="text-texto-medio">
          Chave <span className="font-mono font-medium text-texto">{emprestimo?.chave.codigo}</span>
          {emprestimo?.chave.descricao ? ` · ${emprestimo.chave.descricao}` : ""}
        </p>
        <p>
          Responsável atual:{" "}
          <strong className="font-semibold">{emprestimo?.responsavelAtual.nome}</strong> ·{" "}
          <span className="font-mono text-texto-medio">
            {emprestimo?.responsavelAtual.matricula}
          </span>
        </p>

        <Campo label="Matrícula do novo responsável" htmlFor={idMatricula}>
          <div className="flex gap-2.5">
            <Entrada
              id={idMatricula}
              value={matricula}
              onChange={(evento) => {
                setMatricula(evento.target.value);
                setDestino(null);
              }}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") {
                  evento.preventDefault();
                  void buscar();
                }
              }}
              placeholder="Matrícula do solicitante"
            />
            <Botao onClick={() => void buscar()} carregando={buscando} disabled={enviando}>
              Buscar solicitante
            </Botao>
          </div>
        </Campo>

        {destino && (
          <div className="rounded-lg border border-linha bg-superficie-alta px-4 py-3">
            <p className="font-medium text-texto">{destino.nome}</p>
            <p className="mt-1 font-mono text-xs text-texto-medio">{destino.matricula}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Selo variante={varianteTipo[destino.tipo] ?? "aluno"}>
                {formatarTipo(destino.tipo)}
              </Selo>
              <Selo variante={destino.ativo ? "ativo" : "inativo"}>
                {destino.ativo ? "Ativo" : "Inativo"}
              </Selo>
            </div>
          </div>
        )}

        <Campo label="Observações (opcional)" htmlFor={idObservacoes}>
          <AreaTexto
            id={idObservacoes}
            value={observacoes}
            maxLength={255}
            onChange={(evento) => setObservacoes(evento.target.value)}
            placeholder="Informações sobre o repasse"
          />
        </Campo>

        <Alerta variante="aviso">
          Ao repassar, a responsabilidade passa para outra pessoa. Você não poderá devolver
          esta chave enquanto ela estiver com o novo responsável.
        </Alerta>

        {erro && <Alerta>{erro}</Alerta>}

        <div className="flex justify-end gap-2.5 pt-1">
          <Botao onClick={fechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            onClick={() => void confirmar()}
            disabled={!destino || enviando}
            carregando={enviando}
          >
            Confirmar repasse
          </Botao>
        </div>
      </div>
    </Modal>
  );
}
