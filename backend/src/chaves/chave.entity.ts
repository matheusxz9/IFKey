import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Emprestimo } from '../emprestimos/emprestimo.entity';
import { StatusChave } from '../common/enums/status-chave.enum';

@Entity('chave')
export class Chave {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  codigo: string;

  @Column({ length: 120, nullable: true })
  descricao: string;

  @Column({ length: 120, nullable: true })
  localizacao: string;

  @Column({ type: 'varchar', length: 20, default: 'DISPONIVEL' })
  status: StatusChave;

  @CreateDateColumn({ name: 'data_cadastro' })
  dataCadastro: Date;

  @Column({ default: true })
  ativo: boolean;

  @OneToMany(() => Emprestimo, (emprestimo) => emprestimo.chave)
  emprestimos: Emprestimo[];
}
