import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-para-teste';

describe('Fluxos de negócio (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let token: string;
  let tokenSolicitante: string;
  let chaveDoSolicitante: number;
  let emprestimoDoSolicitante: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer() as App;

    const dataSource = app.get(DataSource);
    await dataSource.query(
      'TRUNCATE TABLE emprestimo_repasse, emprestimo, chave, solicitante, administrador, refresh_token RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      "INSERT INTO administrador (id, nome, login, perfil, ativo) VALUES (1, 'Admin Teste', 'admin.teste', 'ADMINISTRADOR', true)",
    );
    await dataSource.query(
      "SELECT setval(pg_get_serial_sequence('administrador', 'id'), 1, true)",
    );

    token = jwt.sign(
      { sub: 1, login: 'admin.teste', perfil: 'ADMINISTRADOR' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria solicitante com sucesso (201, ativo default true)', async () => {
    const res = await request(server)
      .post('/api/solicitantes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Maria Silva',
        tipo: 'ALUNO',
        matricula: '2024112345',
        contato: 'maria@if.edu.br',
      })
      .expect(201);
    expect(res.body).toMatchObject({
      nome: 'Maria Silva',
      tipo: 'ALUNO',
      ativo: true,
    });
  });

  it('rejeita campo extra (400 VALIDACAO)', async () => {
    const res = await request(server)
      .post('/api/solicitantes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Joao',
        tipo: 'ALUNO',
        matricula: '2024000001',
        contato: 'j@if.edu.br',
        hack: true,
      })
      .expect(400);
    expect(res.body).toMatchObject({ statusCode: 400, code: 'VALIDACAO' });
  });

  it('normaliza espaços dos campos de texto', async () => {
    const res = await request(server)
      .post('/api/solicitantes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: '  João Trim  ',
        tipo: 'ALUNO',
        matricula: ' 2024000002 ',
        contato: '  joao.trim@if.edu.br  ',
      })
      .expect(201);
    expect(res.body).toMatchObject({
      nome: 'João Trim',
      matricula: '2024000002',
      contato: 'joao.trim@if.edu.br',
    });
  });

  it('rejeita nome acima do limite (400 VALIDACAO)', async () => {
    const res = await request(server)
      .post('/api/solicitantes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'a'.repeat(121),
        tipo: 'ALUNO',
        matricula: '2024000003',
        contato: 'limite@if.edu.br',
      })
      .expect(400);
    expect(res.body).toMatchObject({ statusCode: 400, code: 'VALIDACAO' });
  });

  it('rejeita campo obrigatório em branco após trim (400 VALIDACAO)', async () => {
    const res = await request(server)
      .post('/api/solicitantes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: '   ',
        tipo: 'ALUNO',
        matricula: '2024000004',
        contato: 'vazio@if.edu.br',
      })
      .expect(400);
    expect(res.body).toMatchObject({ statusCode: 400, code: 'VALIDACAO' });
  });

  it('rejeita observações acima do limite (400 VALIDACAO)', async () => {
    const res = await request(server)
      .post('/api/emprestimos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        solicitanteId: 1,
        chaveId: 999,
        observacoes: 'x'.repeat(256),
      })
      .expect(400);
    expect(res.body).toMatchObject({ statusCode: 400, code: 'VALIDACAO' });
  });

  it('rejeita refresh token ausente com 400 (não 500)', async () => {
    const res = await request(server)
      .post('/api/auth/refresh')
      .send({})
      .expect(400);
    expect(res.body).toMatchObject({ statusCode: 400, code: 'VALIDACAO' });
  });

  it('faz logout público e idempotente, revogando o refresh token', async () => {
    const refreshToken = 'refresh-logout-e2e';
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const dataSource = app.get(DataSource);
    await dataSource.query(
      `INSERT INTO refresh_token ("tokenHash", "userId", "userType", "expires_at")
       VALUES ($1, $2, $3, now() + interval '1 day')`,
      [tokenHash, 1, 'admin'],
    );

    await request(server)
      .post('/api/auth/logout')
      .send({ refreshToken })
      .expect(200);

    const refresh = await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(403);
    expect(refresh.body).toMatchObject({ code: 'SEM_PERMISSAO' });

    // Repetir o logout (token já revogado) e usar um token desconhecido
    // continua retornando 200: a operação é idempotente.
    await request(server)
      .post('/api/auth/logout')
      .send({ refreshToken })
      .expect(200);
    await request(server)
      .post('/api/auth/logout')
      .send({ refreshToken: 'refresh-desconhecido' })
      .expect(200);

    await request(server).post('/api/auth/logout').send({}).expect(400);
  });

  it('rotaciona o refresh token e revoga a família ao detectar reutilização', async () => {
    const dataSource = app.get(DataSource);
    const refreshAntigo = `refresh-antigo-${randomUUID()}`;
    const familia = randomUUID();
    const hashAntigo = createHash('sha256').update(refreshAntigo).digest('hex');

    await dataSource.query(
      `INSERT INTO refresh_token ("tokenHash", "userId", "userType", "familyId", "expires_at")
       VALUES ($1, 1, 'admin', $2, now() + interval '1 day')`,
      [hashAntigo, familia],
    );

    const rotacao = await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshAntigo })
      .expect(200);
    expect(rotacao.body.refreshToken).toEqual(expect.any(String));
    expect(rotacao.body.refreshToken).not.toBe(refreshAntigo);

    const hashNovo = createHash('sha256')
      .update(rotacao.body.refreshToken as string)
      .digest('hex');
    const [novo] = await dataSource.query(
      `SELECT "familyId", revoked FROM refresh_token WHERE "tokenHash" = $1`,
      [hashNovo],
    );
    expect(novo).toMatchObject({ familyId: familia, revoked: false });

    await dataSource.query(
      `UPDATE refresh_token SET revoked_at = now() - interval '1 minute' WHERE "tokenHash" = $1`,
      [hashAntigo],
    );

    const reuso = await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshAntigo })
      .expect(403);
    expect(reuso.body).toMatchObject({
      statusCode: 403,
      code: 'REFRESH_TOKEN_REUTILIZADO',
    });

    const [revogados] = await dataSource.query(
      `SELECT count(*)::int AS total FROM refresh_token WHERE "familyId" = $1 AND revoked = false`,
      [familia],
    );
    expect(revogados.total).toBe(0);

    await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken: rotacao.body.refreshToken })
      .expect(403);

    const outraFamilia = `refresh-outra-familia-${randomUUID()}`;
    await dataSource.query(
      `INSERT INTO refresh_token ("tokenHash", "userId", "userType", "familyId", "expires_at")
       VALUES ($1, 1, 'admin', $2, now() + interval '1 day')`,
      [createHash('sha256').update(outraFamilia).digest('hex'), randomUUID()],
    );
    await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken: outraFamilia })
      .expect(200);
  });

  it('tolera renovação concorrente do mesmo refresh token dentro da janela de graça', async () => {
    const dataSource = app.get(DataSource);
    const refreshToken = `refresh-concorrente-${randomUUID()}`;
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await dataSource.query(
      `INSERT INTO refresh_token ("tokenHash", "userId", "userType", "familyId", "expires_at")
       VALUES ($1, 1, 'admin', $2, now() + interval '1 day')`,
      [tokenHash, randomUUID()],
    );

    const [primeira, segunda] = await Promise.all([
      request(server).post('/api/auth/refresh').send({ refreshToken }),
      request(server).post('/api/auth/refresh').send({ refreshToken }),
    ]);
    const sucesso = [primeira, segunda].find((res) => res.status === 200);
    const falha = [primeira, segunda].find((res) => res.status === 403);

    expect(sucesso).toBeDefined();
    expect(falha).toBeDefined();
    expect(falha?.body).toMatchObject({ code: 'SEM_PERMISSAO' });

    await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken: sucesso!.body.refreshToken })
      .expect(200);
  });

  it('faz logout de toda a família do refresh token apresentado', async () => {
    const dataSource = app.get(DataSource);
    const familia = randomUUID();
    const tokenA = `logout-familia-a-${randomUUID()}`;
    const tokenB = `logout-familia-b-${randomUUID()}`;

    for (const token of [tokenA, tokenB]) {
      await dataSource.query(
        `INSERT INTO refresh_token ("tokenHash", "userId", "userType", "familyId", "expires_at")
         VALUES ($1, 1, 'admin', $2, now() + interval '1 day')`,
        [createHash('sha256').update(token).digest('hex'), familia],
      );
    }

    await request(server)
      .post('/api/auth/logout')
      .send({ refreshToken: tokenA })
      .expect(200);

    await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken: tokenB })
      .expect(403);

    const [ativos] = await dataSource.query(
      `SELECT count(*)::int AS total FROM refresh_token WHERE "familyId" = $1 AND revoked = false`,
      [familia],
    );
    expect(ativos.total).toBe(0);
  });

  it('revoga o token criado por rotação concorrente com o logout', async () => {
    const dataSource = app.get(DataSource);
    const familia = randomUUID();
    const refreshAntigo = `logout-rotacao-${randomUUID()}`;
    const refreshNovo = `logout-rotacao-novo-${randomUUID()}`;
    const hashAntigo = createHash('sha256').update(refreshAntigo).digest('hex');
    const hashNovo = createHash('sha256').update(refreshNovo).digest('hex');

    await dataSource.query(
      `INSERT INTO refresh_token ("tokenHash", "userId", "userType", "familyId", "expires_at")
       VALUES ($1, 1, 'admin', $2, now() + interval '1 day')`,
      [hashAntigo, familia],
    );

    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    const logout = request(server)
      .post('/api/auth/logout')
      .send({ refreshToken: refreshAntigo })
      .then((resposta) => resposta);

    let bloqueado = false;
    let statusLogout = 0;
    try {
      await runner.query(
        'SELECT 1 FROM refresh_token WHERE "tokenHash" = $1 FOR UPDATE',
        [hashAntigo],
      );
      await runner.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))',
        [familia],
      );
      const [transacao] = await runner.query(
        'SELECT txid_current()::text AS txid',
      );

      // Espera o logout ficar bloqueado (na família ou na linha da rotação)
      // antes de simular a rotação que cria o token novo.
      for (let tentativa = 0; tentativa < 200 && !bloqueado; tentativa += 1) {
        const [linha] = await dataSource.query(
          `SELECT count(*)::int AS total
             FROM pg_locks
            WHERE NOT granted
              AND (
                (
                  locktype = 'advisory'
                  AND ((classid::bigint << 32) | objid::bigint) =
                      hashtextextended($1::text, 0)
                )
                OR (
                  locktype = 'transactionid'
                  AND transactionid::text = $2
                )
              )`,
          [familia, transacao.txid],
        );
        bloqueado = linha.total > 0;
        if (!bloqueado) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      if (bloqueado) {
        await runner.query(
          `UPDATE refresh_token SET revoked = true, revoked_at = now() WHERE "tokenHash" = $1`,
          [hashAntigo],
        );
        await runner.query(
          `INSERT INTO refresh_token ("tokenHash", "userId", "userType", "familyId", "expires_at")
           VALUES ($1, 1, 'admin', $2, now() + interval '1 day')`,
          [hashNovo, familia],
        );
      }

      if (runner.isTransactionActive) await runner.commitTransaction();
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
      statusLogout = (await logout).status;
    }

    expect(bloqueado).toBe(true);
    expect(statusLogout).toBe(200);

    const [ativos] = await dataSource.query(
      `SELECT count(*)::int AS total FROM refresh_token WHERE "familyId" = $1 AND revoked = false`,
      [familia],
    );
    expect(ativos.total).toBe(0);
  });

  it('remove tokens expirados da família ao rotacionar e ao fazer logout', async () => {
    const dataSource = app.get(DataSource);
    const familia = randomUUID();
    const expirado = `limpeza-expirado-${randomUUID()}`;
    const valido = `limpeza-valido-${randomUUID()}`;

    const inserir = (token: string, expiracao: string) =>
      dataSource.query(
        `INSERT INTO refresh_token ("tokenHash", "userId", "userType", "familyId", "expires_at")
         VALUES ($1, 1, 'admin', $2, now() + $3::interval)`,
        [createHash('sha256').update(token).digest('hex'), familia, expiracao],
      );

    await inserir(expirado, '-1 day');
    await inserir(valido, '1 day');

    const rotacao = await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken: valido })
      .expect(200);

    const [expirados] = await dataSource.query(
      `SELECT count(*)::int AS total FROM refresh_token WHERE "tokenHash" = $1`,
      [createHash('sha256').update(expirado).digest('hex')],
    );
    expect(expirados.total).toBe(0);

    const expiradoNoLogout = `limpeza-logout-${randomUUID()}`;
    await inserir(expiradoNoLogout, '-1 day');

    await request(server)
      .post('/api/auth/logout')
      .send({ refreshToken: rotacao.body.refreshToken })
      .expect(200);

    const [restante] = await dataSource.query(
      `SELECT count(*)::int AS total FROM refresh_token WHERE "tokenHash" = $1`,
      [createHash('sha256').update(expiradoNoLogout).digest('hex')],
    );
    expect(restante.total).toBe(0);
  });

  it('rejeita matrícula duplicada (409 MATRICULA_DUPLICADA)', async () => {
    const res = await request(server)
      .post('/api/solicitantes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Maria 2',
        tipo: 'PROFESSOR',
        matricula: '2024112345',
        contato: 'm2@if.edu.br',
      })
      .expect(409);
    expect(res.body).toMatchObject({
      statusCode: 409,
      code: 'MATRICULA_DUPLICADA',
    });
  });

  it('cria chave com status DISPONIVEL (201)', async () => {
    const res = await request(server)
      .post('/api/chaves')
      .set('Authorization', `Bearer ${token}`)
      .send({
        codigo: 'LAB-01',
        descricao: 'Laboratório de Informática 1',
        localizacao: 'Bloco A - Sala 1',
      })
      .expect(201);
    expect(res.body).toMatchObject({
      codigo: 'LAB-01',
      status: 'DISPONIVEL',
      ativo: true,
    });
  });

  it('bloqueia empréstimo sem token (401 NAO_AUTENTICADO)', async () => {
    const res = await request(server)
      .post('/api/emprestimos')
      .send({ solicitanteId: 1, chaveId: 1 })
      .expect(401);
    expect(res.body).toMatchObject({ code: 'NAO_AUTENTICADO' });
  });

  it('registra empréstimo com token (201) e marca a chave emprestada', async () => {
    const res = await request(server)
      .post('/api/emprestimos')
      .set('Authorization', `Bearer ${token}`)
      .send({ solicitanteId: 1, chaveId: 1, observacoes: 'Devolver ate 18h' })
      .expect(201);
    expect(res.body).toMatchObject({
      status: 'EMPRESTADA',
      administrador: { id: 1, nome: 'Admin Teste' },
    });

    const chave = await request(server)
      .get('/api/chaves/1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(chave.body.status).toBe('EMPRESTADA');
  });

  it('bloqueia empréstimo de chave emprestada (409 CHAVE_INDISPONIVEL)', async () => {
    const res = await request(server)
      .post('/api/emprestimos')
      .set('Authorization', `Bearer ${token}`)
      .send({ solicitanteId: 1, chaveId: 1 })
      .expect(409);
    expect(res.body).toMatchObject({
      statusCode: 409,
      code: 'CHAVE_INDISPONIVEL',
    });
  });

  it('registra devolução (200) e devolve a chave a DISPONIVEL', async () => {
    const res = await request(server)
      .patch('/api/emprestimos/1/devolucao')
      .set('Authorization', `Bearer ${token}`)
      .send({ observacoes: 'Devolvida em bom estado' })
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'DEVOLVIDA',
      dataHoraDevolucao: expect.any(String),
    });

    const chave = await request(server)
      .get('/api/chaves/1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(chave.body.status).toBe('DISPONIVEL');
  });

  it('bloqueia devolução duplicada (409 EMPRESTIMO_JA_DEVOLVIDO)', async () => {
    const res = await request(server)
      .patch('/api/emprestimos/1/devolucao')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(409);
    expect(res.body).toMatchObject({
      statusCode: 409,
      code: 'EMPRESTIMO_JA_DEVOLVIDO',
    });
  });

  it('bloqueia inativação de chave com empréstimo ativo (409 RECURSO_COM_EMPRESTIMO_ATIVO)', async () => {
    await request(server)
      .post('/api/emprestimos')
      .set('Authorization', `Bearer ${token}`)
      .send({ solicitanteId: 1, chaveId: 1 })
      .expect(201);

    const res = await request(server)
      .delete('/api/chaves/1')
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
    expect(res.body).toMatchObject({
      statusCode: 409,
      code: 'RECURSO_COM_EMPRESTIMO_ATIVO',
    });
  });

  it('SOLICITANTE registra empréstimo para si (201): ignora o solicitanteId do body e não grava administrador', async () => {
    const joao = await request(server)
      .post('/api/solicitantes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Joao Souza',
        tipo: 'ALUNO',
        matricula: '2024112346',
        contato: 'joao@if.edu.br',
      })
      .expect(201);

    tokenSolicitante = jwt.sign(
      { sub: joao.body.id, login: '2024112346', perfil: 'SOLICITANTE' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    const chave = await request(server)
      .post('/api/chaves')
      .set('Authorization', `Bearer ${token}`)
      .send({
        codigo: 'SOL-01',
        descricao: 'Chave do solicitante',
        localizacao: 'Bloco A - Sala 9',
      })
      .expect(201);
    chaveDoSolicitante = chave.body.id;

    const res = await request(server)
      .post('/api/emprestimos')
      .set('Authorization', `Bearer ${tokenSolicitante}`)
      .send({ solicitanteId: 1, chaveId: chave.body.id })
      .expect(201);
    expect(res.body).toMatchObject({
      status: 'EMPRESTADA',
      solicitante: { id: joao.body.id, nome: 'Joao Souza' },
      administrador: null,
    });
    emprestimoDoSolicitante = res.body.id;
  });

  it('SOLICITANTE devolve o próprio empréstimo (200) e a chave volta para DISPONIVEL', async () => {
    const res = await request(server)
      .patch(`/api/emprestimos/${emprestimoDoSolicitante}/devolucao`)
      .set('Authorization', `Bearer ${tokenSolicitante}`)
      .send({})
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'DEVOLVIDA',
      dataHoraDevolucao: expect.any(String),
    });

    const chave = await request(server)
      .get(`/api/chaves/${chaveDoSolicitante}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(chave.body.status).toBe('DISPONIVEL');
  });

  it('SOLICITANTE não acessa empréstimo de terceiros (403 SEM_PERMISSAO)', async () => {
    const chave = await request(server)
      .post('/api/chaves')
      .set('Authorization', `Bearer ${token}`)
      .send({
        codigo: 'SOL-02',
        descricao: 'Chave da Maria',
        localizacao: 'Bloco A - Sala 10',
      })
      .expect(201);

    const emprestimoDaMaria = await request(server)
      .post('/api/emprestimos')
      .set('Authorization', `Bearer ${token}`)
      .send({ solicitanteId: 1, chaveId: chave.body.id })
      .expect(201);

    const leitura = await request(server)
      .get(`/api/emprestimos/${emprestimoDaMaria.body.id}`)
      .set('Authorization', `Bearer ${tokenSolicitante}`)
      .expect(403);
    expect(leitura.body).toMatchObject({
      statusCode: 403,
      code: 'SEM_PERMISSAO',
    });

    const devolucao = await request(server)
      .patch(`/api/emprestimos/${emprestimoDaMaria.body.id}/devolucao`)
      .set('Authorization', `Bearer ${tokenSolicitante}`)
      .send({})
      .expect(403);
    expect(devolucao.body).toMatchObject({
      statusCode: 403,
      code: 'SEM_PERMISSAO',
    });

    const conferencia = await request(server)
      .get(`/api/emprestimos/${emprestimoDaMaria.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(conferencia.body.status).toBe('EMPRESTADA');
  });

  it('responde 404 para administrador inexistente (GET e DELETE)', async () => {
    const leitura = await request(server)
      .get('/api/administradores/999')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    expect(leitura.body).toMatchObject({
      statusCode: 404,
      code: 'NAO_ENCONTRADO',
    });

    const remocao = await request(server)
      .delete('/api/administradores/999')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    expect(remocao.body).toMatchObject({
      statusCode: 404,
      code: 'NAO_ENCONTRADO',
    });
  });

  it('bloqueia token de administrador inativado com 401', async () => {
    const criado = await request(server)
      .post('/api/administradores')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Gestor Inativado',
        login: 'gestor.inativado',
        perfil: 'GESTOR',
      })
      .expect(201);

    const tokenInativo = jwt.sign(
      {
        sub: criado.body.id,
        login: criado.body.login,
        perfil: 'GESTOR',
      },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    await request(server)
      .delete(`/api/administradores/${criado.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const listagem = await request(server)
      .get('/api/chaves')
      .set('Authorization', `Bearer ${tokenInativo}`)
      .expect(401);
    expect(listagem.body).toMatchObject({ code: 'NAO_AUTENTICADO' });

    await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenInativo}`)
      .expect(401);
  });

  it('rejeita identificadores duplicados sem diferenciar maiúsculas', async () => {
    const dataSource = app.get(DataSource);
    const sufixo = randomUUID().slice(0, 8);
    const matricula = `case-${sufixo}`;
    const codigo = `CASE-${sufixo}`;
    const login = `case.login.${sufixo}`;

    try {
      await dataSource.query(
        `INSERT INTO solicitante (nome, tipo, matricula) VALUES ('A', 'ALUNO', $1)`,
        [matricula.toUpperCase()],
      );
      await expect(
        dataSource.query(
          `INSERT INTO solicitante (nome, tipo, matricula) VALUES ('B', 'ALUNO', $1)`,
          [matricula.toLowerCase()],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23505' } });

      await dataSource.query(
        `INSERT INTO chave (codigo, descricao, localizacao, status) VALUES ($1, 'A', 'A', 'DISPONIVEL')`,
        [codigo.toUpperCase()],
      );
      await expect(
        dataSource.query(
          `INSERT INTO chave (codigo, descricao, localizacao, status) VALUES ($1, 'B', 'B', 'DISPONIVEL')`,
          [codigo.toLowerCase()],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23505' } });

      await dataSource.query(
        `INSERT INTO administrador (nome, login, perfil) VALUES ('A', $1, 'ADMINISTRADOR')`,
        [login.toUpperCase()],
      );
      await expect(
        dataSource.query(
          `INSERT INTO administrador (nome, login, perfil) VALUES ('B', $1, 'ADMINISTRADOR')`,
          [login.toLowerCase()],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23505' } });
    } finally {
      await dataSource.query(
        `DELETE FROM solicitante WHERE LOWER(matricula) = LOWER($1)`,
        [matricula],
      );
      await dataSource.query(
        `DELETE FROM chave WHERE LOWER(codigo) = LOWER($1)`,
        [codigo],
      );
      await dataSource.query(
        `DELETE FROM administrador WHERE LOWER(login) = LOWER($1)`,
        [login],
      );
    }
  });

  it('prévia e confirmação de CSV preservam a revisão antes de gravar', async () => {
    const previa = await request(server)
      .post('/api/solicitantes/importacao/previa')
      .set('Authorization', `Bearer ${token}`)
      .attach(
        'arquivo',
        Buffer.from(
          'nome;tipo;matricula;contato\nMaria CSV;ALUNO;CSV-101;\nErro;INVALIDO;CSV-102;',
        ),
        'solicitantes.csv',
      )
      .expect(200);
    expect(previa.body.resumo).toEqual({ novos: 1, duplicados: 0, erros: 1 });
    const antes = await request(server)
      .get('/api/solicitantes?matricula=CSV-101')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(antes.body.data).toHaveLength(0);

    const bloqueado = await request(server)
      .post('/api/solicitantes/importacao')
      .set('Authorization', `Bearer ${token}`)
      .send({
        linhas: previa.body.linhas.map(
          (linha: { linha: number; dados: object }) => ({
            linha: linha.linha,
            ...linha.dados,
          }),
        ),
      })
      .expect(200);
    expect(bloqueado.body).toMatchObject({ criados: 0, erros: 1 });
    const confirmado = await request(server)
      .post('/api/solicitantes/importacao')
      .set('Authorization', `Bearer ${token}`)
      .send({
        linhas: [
          {
            linha: 2,
            nome: 'Maria CSV',
            tipo: 'ALUNO',
            matricula: 'CSV-101',
            contato: null,
          },
        ],
      })
      .expect(200);
    expect(confirmado.body).toMatchObject({ criados: 1, erros: 0 });

    const chave = await request(server)
      .post('/api/chaves/importacao/previa')
      .set('Authorization', `Bearer ${token}`)
      .attach(
        'arquivo',
        Buffer.from('codigo;descricao;localizacao\nCSV-C1;Chave CSV;Bloco A'),
        'chaves.csv',
      )
      .expect(200);
    expect(chave.body.resumo).toEqual({ novos: 1, duplicados: 0, erros: 0 });
    const gravada = await request(server)
      .post('/api/chaves/importacao')
      .set('Authorization', `Bearer ${token}`)
      .send({ linhas: [{ linha: 2, ...chave.body.linhas[0].dados }] })
      .expect(200);
    expect(gravada.body.criados).toBe(1);
  });

  it('repassa a chave e permite devolução apenas ao responsável atual', async () => {
    const criar = (matricula: string) =>
      request(server)
        .post('/api/solicitantes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: matricula,
          matricula,
          tipo: 'ALUNO',
          contato: `${matricula}@ifrn.br`,
        });
    const origem = await criar('REP-101').expect(201);
    const destino = await criar('REP-102').expect(201);
    const chave = await request(server)
      .post('/api/chaves')
      .set('Authorization', `Bearer ${token}`)
      .send({ codigo: 'REP-C1', descricao: 'Repasse', localizacao: 'Bloco A' })
      .expect(201);
    const tokenOrigem = jwt.sign(
      { sub: origem.body.id, login: 'REP-101', perfil: 'SOLICITANTE' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    const tokenDestino = jwt.sign(
      { sub: destino.body.id, login: 'REP-102', perfil: 'SOLICITANTE' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    const emprestimo = await request(server)
      .post('/api/emprestimos')
      .set('Authorization', `Bearer ${tokenOrigem}`)
      .send({ chaveId: chave.body.id, solicitanteId: origem.body.id })
      .expect(201);
    const repasse = await request(server)
      .post(`/api/emprestimos/${emprestimo.body.id}/repasses`)
      .set('Authorization', `Bearer ${tokenOrigem}`)
      .send({ solicitanteId: destino.body.id })
      .expect(201);
    expect(repasse.body.responsavelAtual.id).toBe(destino.body.id);
    expect(repasse.body.repasses).toHaveLength(1);
    await request(server)
      .patch(`/api/emprestimos/${emprestimo.body.id}/devolucao`)
      .set('Authorization', `Bearer ${tokenOrigem}`)
      .send({})
      .expect(403);
    await request(server)
      .delete(`/api/solicitantes/${destino.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
    const devolucao = await request(server)
      .patch(`/api/emprestimos/${emprestimo.body.id}/devolucao`)
      .set('Authorization', `Bearer ${tokenDestino}`)
      .send({})
      .expect(200);
    expect(devolucao.body.devolvidoPor).toMatchObject({
      id: destino.body.id,
      tipo: 'SOLICITANTE',
    });
  });

  it('prévia e commit de solicitantes tratam duplicados, erros e reimportação', async () => {
    await request(server)
      .post('/api/solicitantes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Já Cadastrado',
        tipo: 'ALUNO',
        matricula: 'CSV-DUP',
        contato: 'dup@ifrn.br',
      })
      .expect(201);

    const csv = [
      'nome,tipo,matricula,contato',
      'Novo CSV,ALUNO,CSV-NOVO,',
      'Duplicado,ALUNO,csv-dup,dup2@ifrn.br',
      'Inválido,ESTAGIARIO,CSV-ERR,',
    ].join('\n');

    const previa = await request(server)
      .post('/api/solicitantes/importacao/previa')
      .set('Authorization', `Bearer ${token}`)
      .attach('arquivo', Buffer.from(csv), {
        filename: 'solicitantes.csv',
        contentType: 'text/csv',
      })
      .expect(200);

    expect(previa.body.resumo).toEqual({
      novos: 1,
      duplicados: 1,
      erros: 1,
    });
    expect(
      previa.body.linhas.map((linha: { linha: number; status: string }) => ({
        linha: linha.linha,
        status: linha.status,
      })),
    ).toEqual([
      { linha: 2, status: 'NOVO' },
      { linha: 3, status: 'DUPLICADO' },
      { linha: 4, status: 'ERRO' },
    ]);

    const antes = await request(server)
      .get('/api/solicitantes?matricula=CSV-NOVO')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(antes.body.data).toEqual([]);

    const linhas = previa.body.linhas.map(
      (linha: { linha: number; dados: object }) => ({
        linha: linha.linha,
        ...linha.dados,
      }),
    );
    const bloqueado = await request(server)
      .post('/api/solicitantes/importacao')
      .set('Authorization', `Bearer ${token}`)
      .send({ linhas })
      .expect(200);
    expect(bloqueado.body).toMatchObject({
      total: 3,
      criados: 0,
      ignorados: 0,
      erros: 1,
    });
    expect(bloqueado.body.ocorrencias).toEqual([
      expect.objectContaining({
        linha: 4,
        status: 'ERRO',
        identificador: 'CSV-ERR',
      }),
    ]);

    const semErro = linhas.filter(
      (linha: { linha: number }) => linha.linha !== 4,
    );
    const commit = await request(server)
      .post('/api/solicitantes/importacao')
      .set('Authorization', `Bearer ${token}`)
      .send({ linhas: semErro })
      .expect(200);
    expect(commit.body).toMatchObject({
      total: 2,
      criados: 1,
      ignorados: 1,
      erros: 0,
    });
    expect(commit.body.ocorrencias).toEqual([
      expect.objectContaining({
        linha: 3,
        status: 'IGNORADO',
        identificador: 'csv-dup',
      }),
    ]);

    const reimportacao = await request(server)
      .post('/api/solicitantes/importacao')
      .set('Authorization', `Bearer ${token}`)
      .send({ linhas: [semErro[0]] })
      .expect(200);
    expect(reimportacao.body).toMatchObject({
      criados: 0,
      ignorados: 1,
      erros: 0,
    });

    const criado = await request(server)
      .get('/api/solicitantes?matricula=CSV-NOVO')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(criado.body.data[0].contato).toBeNull();
    const semContato = await request(server)
      .patch(`/api/solicitantes/${criado.body.data[0].id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ contato: null })
      .expect(200);
    expect(semContato.body.contato).toBeNull();

    await request(server)
      .patch(`/api/solicitantes/${criado.body.data[0].id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: '   ' })
      .expect(400);
  });

  it('rejeita arquivos CSV inválidos e acesso de SOLICITANTE à importação', async () => {
    const arquivosInvalidos = [
      Buffer.alloc(0),
      Buffer.from([0xff, 0xfe, 0x00]),
      Buffer.from('nome;tipo\nMaria;ALUNO'),
      Buffer.from(
        `nome;tipo;matricula;contato\n${Array.from(
          { length: 5001 },
          (_, indice) => `Pessoa ${indice};ALUNO;M-${indice};`,
        ).join('\n')}`,
      ),
    ];

    for (const arquivo of arquivosInvalidos) {
      const resposta = await request(server)
        .post('/api/solicitantes/importacao/previa')
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', arquivo, 'invalido.csv')
        .expect(400);
      expect(resposta.body.code).toBe('VALIDACAO');
    }

    await request(server)
      .post('/api/solicitantes/importacao/previa')
      .set('Authorization', `Bearer ${token}`)
      .attach('arquivo', Buffer.alloc(2 * 1024 * 1024 + 1, 0x61), 'grande.csv')
      .expect(413);

    await request(server)
      .post('/api/solicitantes/importacao/previa')
      .set('Authorization', `Bearer ${tokenSolicitante}`)
      .attach(
        'arquivo',
        Buffer.from('nome;tipo;matricula\nX;ALUNO;X-1'),
        'x.csv',
      )
      .expect(403);
  });

  it('prévia e commit de chaves ignoram código duplicado e bloqueiam erro', async () => {
    await request(server)
      .post('/api/chaves')
      .set('Authorization', `Bearer ${token}`)
      .send({
        codigo: 'CSV-CH-EXIST',
        descricao: 'Chave existente',
        localizacao: 'Bloco A',
      })
      .expect(201);

    const csv = [
      'codigo;descricao;localizacao',
      'CSV-CH-NOVO;Nova chave;Bloco B',
      'csv-ch-exist;Duplicada;Bloco A',
      'CSV-CH-ERR;;Bloco C',
    ].join('\n');

    const previa = await request(server)
      .post('/api/chaves/importacao/previa')
      .set('Authorization', `Bearer ${token}`)
      .attach('arquivo', Buffer.from(csv), {
        filename: 'chaves.csv',
        contentType: 'text/csv',
      })
      .expect(200);

    expect(previa.body.resumo).toEqual({
      novos: 1,
      duplicados: 1,
      erros: 1,
    });

    const linhas = previa.body.linhas.map(
      (linha: { linha: number; dados: object }) => ({
        linha: linha.linha,
        ...linha.dados,
      }),
    );
    const bloqueado = await request(server)
      .post('/api/chaves/importacao')
      .set('Authorization', `Bearer ${token}`)
      .send({ linhas })
      .expect(200);
    expect(bloqueado.body).toMatchObject({
      total: 3,
      criados: 0,
      ignorados: 0,
      erros: 1,
    });
    expect(bloqueado.body.ocorrencias).toEqual([
      expect.objectContaining({
        linha: 4,
        status: 'ERRO',
        identificador: 'CSV-CH-ERR',
      }),
    ]);

    const semErro = linhas.filter(
      (linha: { linha: number }) => linha.linha !== 4,
    );
    const commit = await request(server)
      .post('/api/chaves/importacao')
      .set('Authorization', `Bearer ${token}`)
      .send({ linhas: semErro })
      .expect(200);
    expect(commit.body).toMatchObject({
      total: 2,
      criados: 1,
      ignorados: 1,
      erros: 0,
    });

    const busca = await request(server)
      .get('/api/chaves?busca=CSV-CH-NOVO')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(busca.body.data[0]).toMatchObject({
      codigo: 'CSV-CH-NOVO',
      status: 'DISPONIVEL',
    });
  });

  it('repassa responsabilidade e mantém visibilidade para os participantes', async () => {
    const criar = (matricula: string) =>
      request(server)
        .post('/api/solicitantes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: `Pessoa ${matricula}`,
          matricula,
          tipo: 'ALUNO',
          contato: `${matricula}@ifrn.br`,
        });
    const origem = await criar('REP-A').expect(201);
    const destino = await criar('REP-B').expect(201);
    const terceiro = await criar('REP-C').expect(201);
    const tokenOrigem = jwt.sign(
      { sub: origem.body.id, login: 'REP-A', perfil: 'SOLICITANTE' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    const tokenDestino = jwt.sign(
      { sub: destino.body.id, login: 'REP-B', perfil: 'SOLICITANTE' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    const tokenTerceiro = jwt.sign(
      { sub: terceiro.body.id, login: 'REP-C', perfil: 'SOLICITANTE' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    const chave = await request(server)
      .post('/api/chaves')
      .set('Authorization', `Bearer ${token}`)
      .send({
        codigo: 'REP-C2',
        descricao: 'Chave do repasse',
        localizacao: 'Bloco B',
      })
      .expect(201);
    const emprestimo = await request(server)
      .post('/api/emprestimos')
      .set('Authorization', `Bearer ${token}`)
      .send({ solicitanteId: origem.body.id, chaveId: chave.body.id })
      .expect(201);

    const repasse = await request(server)
      .post(`/api/emprestimos/${emprestimo.body.id}/repasses`)
      .set('Authorization', `Bearer ${tokenOrigem}`)
      .send({ solicitanteId: destino.body.id, observacoes: 'Troca de turno' })
      .expect(201);
    expect(repasse.body.solicitante.id).toBe(origem.body.id);
    expect(repasse.body.responsavelAtual).toMatchObject({
      id: destino.body.id,
      matricula: 'REP-B',
    });
    expect(repasse.body.repasses).toEqual([
      expect.objectContaining({
        origem: expect.objectContaining({ id: origem.body.id }),
        destino: expect.objectContaining({ id: destino.body.id }),
        observacoes: 'Troca de turno',
      }),
    ]);

    const chaveApos = await request(server)
      .get(`/api/chaves/${chave.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(chaveApos.body.status).toBe('EMPRESTADA');

    const ativosDestino = await request(server)
      .get('/api/emprestimos?status=EMPRESTADA')
      .set('Authorization', `Bearer ${tokenDestino}`)
      .expect(200);
    expect(
      ativosDestino.body.data.some(
        (item: { id: number }) => item.id === emprestimo.body.id,
      ),
    ).toBe(true);

    await request(server)
      .get(`/api/emprestimos/${emprestimo.body.id}`)
      .set('Authorization', `Bearer ${tokenOrigem}`)
      .expect(200);
    await request(server)
      .get(`/api/emprestimos/${emprestimo.body.id}`)
      .set('Authorization', `Bearer ${tokenTerceiro}`)
      .expect(403);

    await request(server)
      .patch(`/api/emprestimos/${emprestimo.body.id}/devolucao`)
      .set('Authorization', `Bearer ${tokenOrigem}`)
      .send({})
      .expect(403);

    const historico = await request(server)
      .get('/api/emprestimos/historico')
      .set('Authorization', `Bearer ${tokenOrigem}`)
      .expect(200);
    expect(
      historico.body.data.some(
        (item: { id: number }) => item.id === emprestimo.body.id,
      ),
    ).toBe(true);

    const devolucao = await request(server)
      .patch(`/api/emprestimos/${emprestimo.body.id}/devolucao`)
      .set('Authorization', `Bearer ${tokenDestino}`)
      .send({})
      .expect(200);
    expect(devolucao.body.devolvidoPor).toMatchObject({
      tipo: 'SOLICITANTE',
      id: destino.body.id,
    });

    const repasseAposDevolucao = await request(server)
      .post(`/api/emprestimos/${emprestimo.body.id}/repasses`)
      .set('Authorization', `Bearer ${tokenDestino}`)
      .send({ solicitanteId: origem.body.id })
      .expect(409);
    expect(repasseAposDevolucao.body.code).toBe('EMPRESTIMO_JA_DEVOLVIDO');
  });

  it('bloqueia repasses inválidos', async () => {
    const criar = (matricula: string) =>
      request(server)
        .post('/api/solicitantes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: `Pessoa ${matricula}`,
          matricula,
          tipo: 'ALUNO',
          contato: `${matricula}@ifrn.br`,
        });
    const origem = await criar('REP-D').expect(201);
    const destino = await criar('REP-E').expect(201);
    const terceiro = await criar('REP-F').expect(201);
    const inativo = await criar('REP-G').expect(201);
    const tokenOrigem = jwt.sign(
      { sub: origem.body.id, login: 'REP-D', perfil: 'SOLICITANTE' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    const tokenTerceiro = jwt.sign(
      { sub: terceiro.body.id, login: 'REP-F', perfil: 'SOLICITANTE' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    const chave = await request(server)
      .post('/api/chaves')
      .set('Authorization', `Bearer ${token}`)
      .send({
        codigo: 'REP-C3',
        descricao: 'Chave dos repasses inválidos',
        localizacao: 'Bloco C',
      })
      .expect(201);
    const emprestimo = await request(server)
      .post('/api/emprestimos')
      .set('Authorization', `Bearer ${token}`)
      .send({ solicitanteId: origem.body.id, chaveId: chave.body.id })
      .expect(201);
    const emprestimoId = emprestimo.body.id as number;
    const repassar = (id: number, token: string, body: object) =>
      request(server)
        .post(`/api/emprestimos/${id}/repasses`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    const comoAdmin = await repassar(emprestimoId, token, {
      solicitanteId: destino.body.id,
    }).expect(403);
    expect(comoAdmin.body.code).toBe('SEM_PERMISSAO');

    const comoTerceiro = await repassar(emprestimoId, tokenTerceiro, {
      solicitanteId: destino.body.id,
    }).expect(403);
    expect(comoTerceiro.body.code).toBe('SEM_PERMISSAO');

    const paraSi = await repassar(emprestimoId, tokenOrigem, {
      solicitanteId: origem.body.id,
    }).expect(400);
    expect(paraSi.body.code).toBe('VALIDACAO');

    await repassar(emprestimoId, tokenOrigem, {
      solicitanteId: 999999,
    }).expect(404);

    await request(server)
      .delete(`/api/solicitantes/${inativo.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    const paraInativo = await repassar(emprestimoId, tokenOrigem, {
      solicitanteId: inativo.body.id,
    }).expect(409);
    expect(paraInativo.body.code).toBe('SOLICITANTE_INATIVO');

    await repassar(999999, tokenOrigem, {
      solicitanteId: destino.body.id,
    }).expect(404);

    await repassar(emprestimoId, tokenOrigem, {
      solicitanteId: destino.body.id,
      campoExtra: true,
    }).expect(400);
  });

  it('administrador e gestor devolvem qualquer empréstimo registrando o perfil real', async () => {
    const solicitante = await request(server)
      .post('/api/solicitantes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Pessoa Devolução',
        matricula: 'DEV-ADM',
        tipo: 'ALUNO',
        contato: 'dev-adm@ifrn.br',
      })
      .expect(201);
    const criarChave = (codigo: string) =>
      request(server)
        .post('/api/chaves')
        .set('Authorization', `Bearer ${token}`)
        .send({
          codigo,
          descricao: `Chave ${codigo}`,
          localizacao: 'Bloco D',
        })
        .expect(201);

    const chaveAdmin = await criarChave('DEV-C1');
    const emprestimoAdmin = await request(server)
      .post('/api/emprestimos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        solicitanteId: solicitante.body.id,
        chaveId: chaveAdmin.body.id,
      })
      .expect(201);
    const devolucaoAdmin = await request(server)
      .patch(`/api/emprestimos/${emprestimoAdmin.body.id}/devolucao`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);
    expect(devolucaoAdmin.body.devolvidoPor).toMatchObject({
      tipo: 'ADMINISTRADOR',
      id: 1,
      nome: 'Admin Teste',
      login: 'admin.teste',
    });

    const gestor = await request(server)
      .post('/api/administradores')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Gestor Devolução',
        login: 'gestor.devolucao',
        perfil: 'GESTOR',
      })
      .expect(201);
    const tokenGestor = jwt.sign(
      {
        sub: gestor.body.id,
        login: gestor.body.login,
        perfil: 'GESTOR',
      },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    const chaveGestor = await criarChave('DEV-C2');
    const emprestimoGestor = await request(server)
      .post('/api/emprestimos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        solicitanteId: solicitante.body.id,
        chaveId: chaveGestor.body.id,
      })
      .expect(201);
    const devolucaoGestor = await request(server)
      .patch(`/api/emprestimos/${emprestimoGestor.body.id}/devolucao`)
      .set('Authorization', `Bearer ${tokenGestor}`)
      .send({})
      .expect(200);
    expect(devolucaoGestor.body.devolvidoPor).toMatchObject({
      tipo: 'GESTOR',
      id: gestor.body.id,
      login: 'gestor.devolucao',
    });
  });
});
