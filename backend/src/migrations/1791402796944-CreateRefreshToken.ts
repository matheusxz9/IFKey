import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshToken1791402796944 implements MigrationInterface {
  name = 'CreateRefreshToken1791402796944';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_token" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tokenHash" character varying(255) NOT NULL, "userId" integer NOT NULL, "userType" character varying(20) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "revoked_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_refresh_token_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_refresh_token_tokenHash" ON "refresh_token" ("tokenHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_token_user" ON "refresh_token" ("userId", "userType")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_refresh_token_user"`);
    await queryRunner.query(`DROP INDEX "UQ_refresh_token_tokenHash"`);
    await queryRunner.query(`DROP TABLE "refresh_token"`);
  }
}
