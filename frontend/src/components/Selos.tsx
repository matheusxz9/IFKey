import type { PerfilSistema } from "../types/administrador";
import type { StatusChave } from "../types/chave";
import type { TipoSolicitante } from "../types/solicitante";
import { formatarPerfil, formatarTipo } from "../utils/formatacao";
import { Selo, type VarianteSelo } from "./ui/Selo";

const VARIANTE_TIPO: Record<TipoSolicitante, VarianteSelo> = {
  ALUNO: "aluno",
  PROFESSOR: "professor",
  SERVIDOR: "servidor",
};

const VARIANTE_PERFIL: Record<PerfilSistema, VarianteSelo> = {
  ADMINISTRADOR: "administrador",
  GESTOR: "gestor",
  SOLICITANTE: "solicitante",
};

export function SeloStatusChave({ status }: { status: StatusChave }) {
  const disponivel = status === "DISPONIVEL";
  return (
    <Selo variante={disponivel ? "disponivel" : "emprestada"}>
      {disponivel ? "Disponível" : "Emprestada"}
    </Selo>
  );
}

export function SeloAtivo({ ativo }: { ativo: boolean }) {
  return (
    <Selo variante={ativo ? "ativo" : "inativo"}>
      {ativo ? "Ativo" : "Inativo"}
    </Selo>
  );
}

export function SeloTipoSolicitante({ tipo }: { tipo: TipoSolicitante }) {
  return (
    <Selo variante={VARIANTE_TIPO[tipo] ?? "aluno"}>
      {formatarTipo(tipo)}
    </Selo>
  );
}

export function SeloPerfil({ perfil }: { perfil: PerfilSistema }) {
  return (
    <Selo variante={VARIANTE_PERFIL[perfil] ?? "devolvida"}>
      {formatarPerfil(perfil)}
    </Selo>
  );
}
