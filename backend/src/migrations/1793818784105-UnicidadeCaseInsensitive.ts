import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnicidadeCaseInsensitive1793818784105 implements MigrationInterface {
  name = 'UnicidadeCaseInsensitive1793818784105';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM solicitante GROUP BY LOWER(matricula) HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Existem matrículas duplicadas (case-insensitive). Corrija os dados antes da migration.';
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM chave GROUP BY LOWER(codigo) HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Existem códigos de chave duplicados (case-insensitive). Corrija os dados antes da migration.';
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM administrador GROUP BY LOWER(login) HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Existem logins de administrador duplicados (case-insensitive). Corrija os dados antes da migration.';
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_solicitante_matricula_ci" ON "solicitante" (LOWER("matricula"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_chave_codigo_ci" ON "chave" (LOWER("codigo"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_administrador_login_ci" ON "administrador" (LOWER("login"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "uq_administrador_login_ci"`);
    await queryRunner.query(`DROP INDEX "uq_chave_codigo_ci"`);
    await queryRunner.query(`DROP INDEX "uq_solicitante_matricula_ci"`);
  }
}
