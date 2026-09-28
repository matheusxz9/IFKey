import { apiFetch } from "./api";
import type {
  Administrador,
  CriarAdministradorDto,
  AtualizarAdministradorDto,
  ListarAdministradoresQueryDto,
  PaginatedResponse,
} from "../types/administrador";

export const administradoresService = {
  async listar(
    query: ListarAdministradoresQueryDto = {},
  ): Promise<PaginatedResponse<Administrador>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value));
      }
    });
    const response = await apiFetch<PaginatedResponse<Administrador>>(
      `/administradores?${params.toString()}`,
    );
    return response;
  },

  async buscar(id: number): Promise<Administrador> {
    const response = await apiFetch<Administrador>(`/administradores/${id}`);
    return response;
  },

  async criar(dto: CriarAdministradorDto): Promise<Administrador> {
    const response = await apiFetch<Administrador>("/administradores", {
      method: "POST",
      body: JSON.stringify(dto),
    });
    return response;
  },

  async atualizar(
    id: number,
    dto: AtualizarAdministradorDto,
  ): Promise<Administrador> {
    const response = await apiFetch<Administrador>(
      `/administradores/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(dto),
      },
    );
    return response;
  },

  async inativar(id: number): Promise<void> {
    await apiFetch(`/administradores/${id}`, {
      method: "DELETE",
    });
  },
};

export const {
  listar: listarAdministradores,
  buscar: buscarAdministrador,
  criar: criarAdministrador,
  atualizar: atualizarAdministrador,
  inativar: inativarAdministrador,
} = administradoresService;