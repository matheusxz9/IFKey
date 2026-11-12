import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Administrador } from './administradores/administrador.entity';
import { Solicitante } from './solicitantes/solicitante.entity';
import { Chave } from './chaves/chave.entity';
import { Emprestimo } from './emprestimos/emprestimo.entity';
import { RepasseEmprestimo } from './emprestimos/repasse-emprestimo.entity';
import { RefreshToken } from './auth/refresh-token.entity';

class DataSourceTeste extends DataSource {
  construirMetadados() {
    return this.buildMetadatas();
  }
}

describe('Metadados das entidades', () => {
  it('aceita as colunas anuláveis sem tipo inválido', async () => {
    const dataSource = new DataSourceTeste({
      type: 'postgres',
      entities: [
        Administrador,
        Solicitante,
        Chave,
        Emprestimo,
        RepasseEmprestimo,
        RefreshToken,
      ],
    });

    await expect(dataSource.construirMetadados()).resolves.toBeUndefined();
  });
});
