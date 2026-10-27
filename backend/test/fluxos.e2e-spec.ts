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
      'TRUNCATE TABLE emprestimo, chave, solicitante, administrador, refresh_token RESTART IDENTITY CASCADE',
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
});
