import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenFamily1792615793671 implements MigrationInterface {
  name = 'AddRefreshTokenFamily1792615793671';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD "familyId" uuid NOT NULL DEFAULT gen_random_uuid()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_token_family" ON "refresh_token"  ("familyId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_refresh_token_family"`);
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP COLUMN "familyId"`,
    );
  }
}
