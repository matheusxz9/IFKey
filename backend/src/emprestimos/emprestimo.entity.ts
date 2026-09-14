import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Administrador } from '../administradores/administrador.entity';
import { Chave } from '../chaves/chave.entity';
import { Solicitante } from '../solicitantes/solicitante.entity';
import { StatusEmprestimo } from '../common/enums/status-emprestimo.enum';

@Entity('emprestimo')
export class Emprestimo {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Solicitante, (solicitante) => solicitante.emprestimos)
  @JoinColumn({ name: 'id_solicitante' })
  solicitante: Solicitante;

  @ManyToOne(() => Chave, (chave) => chave.emprestimos)
  @JoinColumn({ name: 'id_chave' })
  chave: Chave;

  @ManyToOne(() => Administrador, (administrador) => administrador.emprestimos)
  @JoinColumn({ name: 'id_administrador_registro' })
  administrador: Administrador;

  @CreateDateColumn({ name: 'data_hora_emprestimo' })
  dataHoraEmprestimo: Date;

  @Column({ name: 'data_hora_devolucao', type: 'timestamptz', nullable: true })
  dataHoraDevolucao: Date;

  @Column({ length: 255, nullable: true })
  observacoes: string;

  @Column({ type: 'varchar', length: 20, default: 'EMPRESTADA' })
  status: StatusEmprestimo;
}
