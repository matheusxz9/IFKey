import Modal from "./Modal";

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
  const corBotao =
    variante === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-yellow-600 hover:bg-yellow-700";

  return (
    <Modal aberto={aberto} onClose={onClose} titulo={titulo} tamanho="sm">
      <p className="text-gray-400">{mensagem}</p>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={carregando}
          className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={carregando}
          className={`rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${corBotao}`}
        >
          {carregando ? "Processando..." : textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}
