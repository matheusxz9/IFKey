import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Emprestimo } from '../emprestimos/emprestimo.entity';

@Index('uq_administrador_login_ci', { synchronize: false })
@Entity('administrador')
export class Administrador {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  nome: string;

  @Column({ length: 80, unique: true })
  login: string;

  @Column({ length: 20 })
  perfil: string;

  @Column({ default: true })
  ativo: boolean;

  @OneToMany(() => Emprestimo, (emprestimo) => emprestimo.administrador)
  emprestimos: Emprestimo[];
}
