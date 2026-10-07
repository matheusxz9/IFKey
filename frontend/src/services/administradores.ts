import { apiFetch, type ApiFetchOptions } from "./api";
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
    options?: ApiFetchOptions,
  ): Promise<PaginatedResponse<Administrador>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value));
      }
    });
    const response = await apiFetch<PaginatedResponse<Administrador>>(
      `/administradores?${params.toString()}`,
      options,
    );
    return response;
  },

  async buscar(id: number, options?: ApiFetchOptions): Promise<Administrador> {
    const response = await apiFetch<Administrador>(
      `/administradores/${id}`,
      options,
    );
    return response;
  },

  async criar(
    dto: CriarAdministradorDto,
    options?: ApiFetchOptions,
  ): Promise<Administrador> {
    const response = await apiFetch<Administrador>("/administradores", {
      method: "POST",
      body: JSON.stringify(dto),
      ...options,
    });
    return response;
  },

  async atualizar(
    id: number,
    dto: AtualizarAdministradorDto,
    options?: ApiFetchOptions,
  ): Promise<Administrador> {
    const response = await apiFetch<Administrador>(
      `/administradores/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(dto),
        ...options,
      },
    );
    return response;
  },

  async inativar(id: number, options?: ApiFetchOptions): Promise<void> {
    await apiFetch(`/administradores/${id}`, {
      method: "DELETE",
      ...options,
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