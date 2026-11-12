import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Emprestimo } from '../emprestimos/emprestimo.entity';
import { TipoSolicitante } from '../common/enums/tipo-solicitante.enum';

@Index('uq_solicitante_matricula_ci', { synchronize: false })
@Entity('solicitante')
export class Solicitante {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  nome: string;

  @Column({ length: 20 })
  tipo: TipoSolicitante;

  @Column({ length: 30, unique: true })
  matricula: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  contato: string | null;

  @Column({ default: true })
  ativo: boolean;

  @OneToMany(() => Emprestimo, (emprestimo) => emprestimo.solicitante)
  emprestimos: Emprestimo[];
}
