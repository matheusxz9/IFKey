import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Emprestimo } from '../emprestimos/emprestimo.entity';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';

@Index('uq_administrador_login_ci', { synchronize: false })
@Entity('administrador')
export class Administrador {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  nome: string;

  @Column({ length: 80, unique: true })
  login: string;

  @Column({ type: 'varchar', length: 20 })
  perfil: PerfilAdministrador;

  @Column({ default: true })
  ativo: boolean;

  @OneToMany(() => Emprestimo, (emprestimo) => emprestimo.administrador)
  emprestimos: Emprestimo[];
}
