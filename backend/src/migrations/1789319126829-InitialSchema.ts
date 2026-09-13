import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1789319126829 implements MigrationInterface {
    name = 'InitialSchema1789319126829'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "chave" ("id" SERIAL NOT NULL, "codigo" character varying(30) NOT NULL, "descricao" character varying(120), "localizacao" character varying(120), "status" character varying(20) NOT NULL DEFAULT 'DISPONIVEL', "data_cadastro" TIMESTAMP NOT NULL DEFAULT now(), "ativo" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_1f13ec2ef439c267621dcf99dbc" UNIQUE ("codigo"), CONSTRAINT "PK_b57abcbed4ec15b52078b1ed9bb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "solicitante" ("id" SERIAL NOT NULL, "nome" character varying(120) NOT NULL, "tipo" character varying(20) NOT NULL, "matricula" character varying(30) NOT NULL, "contato" character varying(120), "ativo" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_df4eff3856882b1691a3921327d" UNIQUE ("matricula"), CONSTRAINT "PK_fd17ff6b39f8d1e3ac36250a286" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "emprestimo" ("id" SERIAL NOT NULL, "data_hora_emprestimo" TIMESTAMP NOT NULL DEFAULT now(), "data_hora_devolucao" TIMESTAMP WITH TIME ZONE, "observacoes" character varying(255), "status" character varying(20) NOT NULL DEFAULT 'EMPRESTADA', "id_solicitante" integer, "id_chave" integer, "id_administrador_registro" integer, CONSTRAINT "PK_d8f9a723b1f2fd57102a5c424f8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "administrador" ("id" SERIAL NOT NULL, "nome" character varying(120) NOT NULL, "login" character varying(80) NOT NULL, "perfil" character varying(20) NOT NULL, "ativo" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_a7a7dd8a14f8b49c923a4905b51" UNIQUE ("login"), CONSTRAINT "PK_a84433082c320e8c25abe76c52e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "emprestimo" ADD CONSTRAINT "FK_a5d5957755b86c10bd368879c0c" FOREIGN KEY ("id_solicitante") REFERENCES "solicitante"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "emprestimo" ADD CONSTRAINT "FK_e4c24c69e697e9f82dd17233cd3" FOREIGN KEY ("id_chave") REFERENCES "chave"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "emprestimo" ADD CONSTRAINT "FK_d2a7e4b0fc7d0623f4c29c3cb5e" FOREIGN KEY ("id_administrador_registro") REFERENCES "administrador"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "emprestimo" DROP CONSTRAINT "FK_d2a7e4b0fc7d0623f4c29c3cb5e"`);
        await queryRunner.query(`ALTER TABLE "emprestimo" DROP CONSTRAINT "FK_e4c24c69e697e9f82dd17233cd3"`);
        await queryRunner.query(`ALTER TABLE "emprestimo" DROP CONSTRAINT "FK_a5d5957755b86c10bd368879c0c"`);
        await queryRunner.query(`DROP TABLE "administrador"`);
        await queryRunner.query(`DROP TABLE "emprestimo"`);
        await queryRunner.query(`DROP TABLE "solicitante"`);
        await queryRunner.query(`DROP TABLE "chave"`);
    }

}
