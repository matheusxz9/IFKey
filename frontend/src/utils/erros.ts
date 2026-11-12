import { AppError } from "../services/AppError";

export function codigoDoErro(error: unknown): string | undefined {
  return error instanceof AppError ? error.code : undefined;
}

export function mensagemDoErro(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
