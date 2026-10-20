import Modal from "./Modal";
import { Botao } from "./ui/Botao";
import { Icone } from "./ui/Icone";

interface ConfirmDialogProps {
  aberto: boolean;
  onClose: () => void;
  onConfirmar: () => void;
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  carregando?: boolean;
  variante?: "danger" | "warning";
}

export default function ConfirmDialog({
  aberto,
  onClose,
  onConfirmar,
  titulo,
  mensagem,
  textoConfirmar = "Confirmar",
  carregando = false,
  variante = "danger",
}: ConfirmDialogProps) {
  const perigo = variante === "danger";

  return (
    <Modal aberto={aberto} onClose={onClose} titulo={titulo} tamanho="sm">
      <div className="flex gap-3.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
            perigo
              ? "border-vermelho/30 bg-veu-vermelho text-vermelho"
              : "border-ambar/30 bg-veu-ambar text-ambar"
          }`}
        >
          <Icone nome="alerta" className="h-4.5 w-4.5" />
        </span>
        <p className="pt-1.5 text-sm leading-relaxed text-texto-medio">{mensagem}</p>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2.5">
        <Botao variante="secundario" onClick={onClose} disabled={carregando}>
          Cancelar
        </Botao>
        <Botao
          variante={perigo ? "perigo" : "aviso"}
          onClick={onConfirmar}
          carregando={carregando}
        >
          {carregando ? "Processando..." : textoConfirmar}
        </Botao>
      </div>
    </Modal>
  );
}
