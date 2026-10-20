import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(dirname, "../../backend");

/**
 * Base determinística para os testes:
 * - recria os dados do seed (2 administradores, 5 chaves, 5 solicitantes)
 * - garante um administrador de perfil GESTOR, que o seed não cria
 *
 * O seed usa TRUNCATE, então roda antes de cada execução da suíte.
 */
export default async function globalSetup() {
  try {
    execFileSync("npm", ["run", "seed"], { cwd: backendDir, stdio: "pipe" });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? "";
    throw new Error(
      "Falha ao preparar o banco de testes.\n" +
        "Verifique se o Postgres está no ar: cd backend && docker compose up -d db\n\n" +
        stderr,
      { cause: error },
    );
  }

  const authDir = path.resolve(dirname, ".auth");
  fs.rmSync(authDir, { recursive: true, force: true });
  fs.mkdirSync(authDir, { recursive: true });
}
