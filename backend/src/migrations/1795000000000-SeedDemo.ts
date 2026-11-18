import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDemo1795000000000 implements MigrationInterface {
  name = 'SeedDemo1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO administrador (nome, login, perfil, ativo)
      SELECT v.nome, v.login, v.perfil, v.ativo
      FROM (VALUES
        ('Administrador Demo', 'demo.admin', 'ADMINISTRADOR', true),
        ('Gestor Demo', 'demo.gestor', 'GESTOR', true)
      ) AS v(nome, login, perfil, ativo)
      WHERE NOT EXISTS (
        SELECT 1 FROM administrador a WHERE LOWER(a.login) = LOWER(v.login)
      )
    `);

    await queryRunner.query(`
      INSERT INTO solicitante (nome, tipo, matricula, contato, ativo)
      SELECT v.nome, v.tipo, v.matricula, v.contato, v.ativo
      FROM (VALUES
        ('Solicitante Demo', 'ALUNO', 'demo.solicitante', 'demo.solicitante@ifrn.edu.br', true),
        ('Ana Demo', 'ALUNO', 'DEMO-ALUNO-01', 'ana.demo@ifrn.edu.br', true),
        ('Bruno Demo', 'ALUNO', 'DEMO-ALUNO-02', 'bruno.demo@ifrn.edu.br', true),
        ('Carla Demo', 'PROFESSOR', 'DEMO-PROF-01', 'carla.demo@ifrn.edu.br', true),
        ('Diego Demo', 'SERVIDOR', 'DEMO-SERV-01', 'diego.demo@ifrn.edu.br', true)
      ) AS v(nome, tipo, matricula, contato, ativo)
      WHERE NOT EXISTS (
        SELECT 1 FROM solicitante s WHERE LOWER(s.matricula) = LOWER(v.matricula)
      )
    `);

    await queryRunner.query(`
      INSERT INTO chave (codigo, descricao, localizacao, status, ativo)
      SELECT v.codigo, v.descricao, v.localizacao, v.status, v.ativo
      FROM (VALUES
        ('DEMO-LAB-01', 'Laboratório de Informática — demonstração', 'Bloco A - Sala 1', 'DISPONIVEL', true),
        ('DEMO-LAB-02', 'Laboratório de Química — demonstração', 'Bloco C - Sala 1', 'DISPONIVEL', true),
        ('DEMO-LAB-03', 'Laboratório de Redes — demonstração', 'Bloco A - Sala 3', 'DISPONIVEL', true),
        ('DEMO-LAB-04', 'Laboratório de Eletrônica — demonstração', 'Bloco B - Sala 4', 'DISPONIVEL', true),
        ('DEMO-LAB-05', 'Laboratório de Física — demonstração', 'Bloco D - Sala 1', 'DISPONIVEL', true)
      ) AS v(codigo, descricao, localizacao, status, ativo)
      WHERE NOT EXISTS (
        SELECT 1 FROM chave c WHERE LOWER(c.codigo) = LOWER(v.codigo)
      )
    `);

    await queryRunner.query(`
      INSERT INTO emprestimo (
        id_solicitante, id_responsavel_atual, id_chave,
        id_administrador_registro, data_hora_emprestimo,
        data_hora_devolucao, observacoes, status
      )
      SELECT s.id, s.id, c.id, a.id, now() - interval '2 hours',
             NULL, 'Demonstração: empréstimo ativo (Ana)', 'EMPRESTADA'
      FROM solicitante s
      JOIN chave c ON c.codigo = 'DEMO-LAB-01'
      JOIN administrador a ON a.login = 'demo.gestor'
      WHERE s.matricula = 'DEMO-ALUNO-01'
        AND NOT EXISTS (
          SELECT 1 FROM emprestimo e
          WHERE e.observacoes = 'Demonstração: empréstimo ativo (Ana)'
        )
    `);

    await queryRunner.query(`
      INSERT INTO emprestimo (
        id_solicitante, id_responsavel_atual, id_chave,
        id_administrador_registro, data_hora_emprestimo,
        data_hora_devolucao, observacoes, status
      )
      SELECT s.id, s.id, c.id, a.id, now() - interval '30 minutes',
             NULL, 'Demonstração: empréstimo ativo (Solicitante Demo)', 'EMPRESTADA'
      FROM solicitante s
      JOIN chave c ON c.codigo = 'DEMO-LAB-03'
      JOIN administrador a ON a.login = 'demo.gestor'
      WHERE s.matricula = 'demo.solicitante'
        AND NOT EXISTS (
          SELECT 1 FROM emprestimo e
          WHERE e.observacoes = 'Demonstração: empréstimo ativo (Solicitante Demo)'
        )
    `);

    await queryRunner.query(`
      INSERT INTO emprestimo (
        id_solicitante, id_responsavel_atual, id_solicitante_devolvedor,
        id_chave, id_administrador_registro, data_hora_emprestimo,
        data_hora_devolucao, observacoes, status
      )
      SELECT s.id, s.id, s.id, c.id, a.id, now() - interval '2 days',
             now() - interval '2 days' + interval '2 hours',
             'Demonstração: empréstimo devolvido (Bruno)', 'DEVOLVIDA'
      FROM solicitante s
      JOIN chave c ON c.codigo = 'DEMO-LAB-02'
      JOIN administrador a ON a.login = 'demo.gestor'
      WHERE s.matricula = 'DEMO-ALUNO-02'
        AND NOT EXISTS (
          SELECT 1 FROM emprestimo e
          WHERE e.observacoes = 'Demonstração: empréstimo devolvido (Bruno)'
        )
    `);

    await queryRunner.query(`
      UPDATE chave SET status = 'EMPRESTADA'
      WHERE codigo LIKE 'DEMO-LAB-%'
        AND EXISTS (
          SELECT 1 FROM emprestimo e
          WHERE e.id_chave = chave.id AND e.status = 'EMPRESTADA'
        )
    `);

    await queryRunner.query(`
      UPDATE chave SET status = 'DISPONIVEL'
      WHERE codigo LIKE 'DEMO-LAB-%'
        AND NOT EXISTS (
          SELECT 1 FROM emprestimo e
          WHERE e.id_chave = chave.id AND e.status = 'EMPRESTADA'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM emprestimo_repasse
      WHERE id_emprestimo IN (
        SELECT id FROM emprestimo WHERE observacoes LIKE 'Demonstração:%'
      )
    `);
    await queryRunner.query(`
      DELETE FROM emprestimo WHERE observacoes LIKE 'Demonstração:%'
    `);
    await queryRunner.query(`
      UPDATE chave SET status = 'DISPONIVEL', ativo = false
      WHERE LOWER(codigo) LIKE 'demo-lab-%'
    `);
    await queryRunner.query(`
      UPDATE solicitante SET ativo = false
      WHERE LOWER(matricula) LIKE 'demo-%'
         OR LOWER(matricula) = 'demo.solicitante'
    `);
    await queryRunner.query(`
      UPDATE administrador SET ativo = false
      WHERE LOWER(login) IN ('demo.admin', 'demo.gestor')
    `);
  }
}
