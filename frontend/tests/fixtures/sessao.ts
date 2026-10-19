import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const AUTH_DIR = path.resolve(dirname, "..", ".auth");
export const USERS_FILE = path.join(AUTH_DIR, "usuarios.json");

export type Papel = "admin" | "gestor" | "solicitante";

export interface UsuarioSessao {
  id: number;
  nome: string;
  login?: string;
  matricula?: string;
  perfil: "ADMINISTRADOR" | "GESTOR" | "SOLICITANTE";
  tipo: "admin" | "solicitante";
}

function lerArquivoEnv(caminho: string): Record<string, string> {
  if (!fs.existsSync(caminho)) return {};
  const mapa: Record<string, string> = {};
  for (const linha of fs.readFileSync(caminho, "utf8").split("\n")) {
    const correspondencia = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (correspondencia) {
      mapa[correspondencia[1]] = correspondencia[2].replace(/^["']|["']$/g, "");
    }
  }
  return mapa;
}

const envFrontend = lerArquivoEnv(path.resolve(dirname, "../../.env"));
const envBackend = lerArquivoEnv(path.resolve(dirname, "../../../backend/.env"));

export const API_URL =
  process.env.E2E_API_URL ?? envFrontend.VITE_API_URL ?? "http://localhost:3000/api";

const urlApi = new URL(API_URL);
/** Origin puro: usado como baseURL dos contextos HTTP do Playwright. */
export const API_ORIGIN = urlApi.origin;
/** Prefixo do caminho (ex.: /api) para montar as rotas das requisições. */
export const API_PREFIX = urlApi.pathname.replace(/\/$/, "");
export const caminhoApi = (rota: string) => `${API_PREFIX}${rota}`;

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

/** Segredo usado pelo backend para assinar/verificar os JWTs. */
export function segredoJwt(): string {
  const segredo = process.env.JWT_SECRET ?? envBackend.JWT_SECRET;
  if (!segredo) {
    throw new Error(
      "JWT_SECRET não encontrado. Defina a variável ou mantenha o backend/.env preenchido.",
    );
  }
  return segredo;
}

function base64url(dado: string | Buffer): string {
  return Buffer.from(dado).toString("base64url");
}

/** Assina um JWT HS256 com o mesmo segredo usado pela API. */
export function assinarJwt(
  payload: Record<string, unknown>,
  expiracaoEmSegundos = 60 * 60,
): string {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const corpo = base64url(
    JSON.stringify({ ...payload, iat: agora, exp: agora + expiracaoEmSegundos }),
  );
  const dado = `${cabecalho}.${corpo}`;
  const assinatura = crypto
    .createHmac("sha256", segredoJwt())
    .update(dado)
    .digest("base64url");
  return `${dado}.${assinatura}`;
}

export function tokenDe(usuario: UsuarioSessao): string {
  return assinarJwt({
    sub: usuario.id,
    login: usuario.login ?? usuario.matricula,
    perfil: usuario.perfil,
  });
}

export function lerUsuarios(): Record<Papel, UsuarioSessao> {
  if (!fs.existsSync(USERS_FILE)) {
    throw new Error(
      `Sessões de teste não preparadas (${USERS_FILE}). Execute o projeto "setup" da suíte.`,
    );
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as Record<
    Papel,
    UsuarioSessao
  >;
}

export function caminhoStorageState(papel: Papel): string {
  return path.join(AUTH_DIR, `${papel}.json`);
}

/**
 * Grava a sessão direto no localStorage antes do carregamento da página.
 * Usado nos testes que precisam de um token específico (ex.: expirado/inválido),
 * fora do storageState gerado no setup.
 */
export async function injetarSessao(page: Page, usuario: UsuarioSessao, token?: string) {
  const valor = token ?? tokenDe(usuario);
  await page.addInitScript(
    ([tokenAtual, usuarioAtual]) => {
      // Injeção única por aba: sem isso, um redirect (ex.: sessão expirada)
      // recarrega a página e reinjetaria a sessão, escondendo o logout.
      if (sessionStorage.getItem("e2e-sessao-injetada")) return;
      sessionStorage.setItem("e2e-sessao-injetada", "1");
      localStorage.setItem("accessToken", tokenAtual);
      localStorage.setItem("user", usuarioAtual);
    },
    [valor, JSON.stringify(usuario)] as const,
  );
}
