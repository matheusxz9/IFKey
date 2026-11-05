import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRepasseResponsabilidade1793820000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "emprestimo" ADD "id_responsavel_atual" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "emprestimo" ADD "id_solicitante_devolvedor" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "emprestimo" ADD "id_administrador_devolvedor" integer',
    );
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM "emprestimo" WHERE "id_solicitante" IS NULL) THEN
        RAISE EXCEPTION 'Existem empréstimos sem solicitante. Corrija os dados antes da migration.';
      END IF;
    END $$`);
    await queryRunner.query(
      'UPDATE "emprestimo" SET "id_responsavel_atual" = "id_solicitante"',
    );
    await queryRunner.query(
      'ALTER TABLE "emprestimo" ALTER COLUMN "id_responsavel_atual" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "emprestimo" ADD CONSTRAINT "FK_emprestimo_responsavel_atual" FOREIGN KEY ("id_responsavel_atual") REFERENCES "solicitante"("id")',
    );
    await queryRunner.query(
      'ALTER TABLE "emprestimo" ADD CONSTRAINT "FK_emprestimo_devolvedor_solicitante" FOREIGN KEY ("id_solicitante_devolvedor") REFERENCES "solicitante"("id")',
    );
    await queryRunner.query(
      'ALTER TABLE "emprestimo" ADD CONSTRAINT "FK_emprestimo_devolvedor_administrador" FOREIGN KEY ("id_administrador_devolvedor") REFERENCES "administrador"("id")',
    );
    await queryRunner.query(
      'ALTER TABLE "emprestimo" ADD CONSTRAINT "CHK_emprestimo_devolvedor_unico" CHECK (num_nonnulls("id_solicitante_devolvedor", "id_administrador_devolvedor") <= 1)',
    );
    await queryRunner.query(`CREATE TABLE "emprestimo_repasse" (
      "id_emprestimo_repasse" SERIAL PRIMARY KEY,
      "id_emprestimo" integer NOT NULL REFERENCES "emprestimo"("id"),
      "id_solicitante_origem" integer NOT NULL REFERENCES "solicitante"("id"),
      "id_solicitante_destino" integer NOT NULL REFERENCES "solicitante"("id"),
      "data_hora" timestamptz NOT NULL DEFAULT now(),
      "observacoes" varchar(255)
    )`);
    await queryRunner.query(
      'CREATE INDEX "IDX_repasse_emprestimo" ON "emprestimo_repasse" ("id_emprestimo")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_repasse_origem" ON "emprestimo_repasse" ("id_solicitante_origem")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_repasse_destino" ON "emprestimo_repasse" ("id_solicitante_destino")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "emprestimo_repasse"');
    await queryRunner.query(
      'ALTER TABLE "emprestimo" DROP CONSTRAINT "CHK_emprestimo_devolvedor_unico"',
    );
    await queryRunner.query(
      'ALTER TABLE "emprestimo" DROP CONSTRAINT "FK_emprestimo_devolvedor_administrador"',
    );
    await queryRunner.query(
      'ALTER TABLE "emprestimo" DROP CONSTRAINT "FK_emprestimo_devolvedor_solicitante"',
    );
    await queryRunner.query(
      'ALTER TABLE "emprestimo" DROP CONSTRAINT "FK_emprestimo_responsavel_atual"',
    );
    await queryRunner.query(
      'ALTER TABLE "emprestimo" DROP COLUMN "id_administrador_devolvedor"',
    );
    await queryRunner.query(
      'ALTER TABLE "emprestimo" DROP COLUMN "id_solicitante_devolvedor"',
    );
    await queryRunner.query(
      'ALTER TABLE "emprestimo" DROP COLUMN "id_responsavel_atual"',
    );
  }
}
