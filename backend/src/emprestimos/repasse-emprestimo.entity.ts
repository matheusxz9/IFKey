import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Emprestimo } from './emprestimo.entity';
import { Solicitante } from '../solicitantes/solicitante.entity';

@Entity('emprestimo_repasse')
export class RepasseEmprestimo {
  @PrimaryGeneratedColumn({ name: 'id_emprestimo_repasse' })
  id: number;

  @ManyToOne(() => Emprestimo, (emprestimo) => emprestimo.repasses, {
    nullable: false,
  })
  @JoinColumn({ name: 'id_emprestimo' })
  emprestimo: Emprestimo;

  @ManyToOne(() => Solicitante, { nullable: false })
  @JoinColumn({ name: 'id_solicitante_origem' })
  origem: Solicitante;

  @ManyToOne(() => Solicitante, { nullable: false })
  @JoinColumn({ name: 'id_solicitante_destino' })
  destino: Solicitante;

  @CreateDateColumn({ name: 'data_hora', type: 'timestamptz' })
  dataHora: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacoes: string | null;
}
