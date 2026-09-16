import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-para-teste';

describe('Fluxos de negócio (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let token: string;

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
      'TRUNCATE TABLE emprestimo, chave, solicitante, administrador RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      "INSERT INTO administrador (id, nome, login, perfil, ativo) VALUES (1, 'Admin Teste', 'admin.teste', 'ADMINISTRADOR', true)",
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

  it('rejeita matrícula duplicada (409 MATRICULA_DUPLICADA)', async () => {
    const res = await request(server)
      .post('/api/solicitantes')
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

    const chave = await request(server).get('/api/chaves/1').expect(200);
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

    const chave = await request(server).get('/api/chaves/1').expect(200);
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

    const res = await request(server).delete('/api/chaves/1').expect(409);
    expect(res.body).toMatchObject({
      statusCode: 409,
      code: 'RECURSO_COM_EMPRESTIMO_ATIVO',
    });
  });
});
