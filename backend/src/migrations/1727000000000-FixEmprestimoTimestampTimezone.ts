import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEmprestimoTimestampTimezone1727000000000
  implements MigrationInterface
{
  name = 'FixEmprestimoTimestampTimezone1727000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "emprestimo" ALTER COLUMN "data_hora_emprestimo" TYPE TIMESTAMPTZ`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "emprestimo" ALTER COLUMN "data_hora_emprestimo" TYPE TIMESTAMP`,
    );
  }
}
