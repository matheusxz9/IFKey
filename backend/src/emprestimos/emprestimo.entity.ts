import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Administrador } from '../administradores/administrador.entity';
import { Chave } from '../chaves/chave.entity';
import { Solicitante } from '../solicitantes/solicitante.entity';
import { StatusEmprestimo } from '../common/enums/status-emprestimo.enum';
import { RepasseEmprestimo } from './repasse-emprestimo.entity';

@Entity('emprestimo')
export class Emprestimo {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Solicitante, (solicitante) => solicitante.emprestimos)
  @JoinColumn({ name: 'id_solicitante' })
  solicitante: Solicitante;

  @ManyToOne(() => Solicitante, { nullable: false })
  @JoinColumn({ name: 'id_responsavel_atual' })
  responsavelAtual: Solicitante;

  @ManyToOne(() => Solicitante, { nullable: true })
  @JoinColumn({ name: 'id_solicitante_devolvedor' })
  devolvedorSolicitante: Solicitante | null;

  @ManyToOne(() => Administrador, { nullable: true })
  @JoinColumn({ name: 'id_administrador_devolvedor' })
  devolvedorAdministrador: Administrador | null;

  @OneToMany(() => RepasseEmprestimo, (repasse) => repasse.emprestimo)
  repasses: RepasseEmprestimo[];

  @ManyToOne(() => Chave, (chave) => chave.emprestimos)
  @JoinColumn({ name: 'id_chave' })
  chave: Chave;

  @ManyToOne(() => Administrador, (administrador) => administrador.emprestimos)
  @JoinColumn({ name: 'id_administrador_registro' })
  administrador: Administrador | null;

  @CreateDateColumn({ name: 'data_hora_emprestimo', type: 'timestamptz' })
  dataHoraEmprestimo: Date;

  @Column({ name: 'data_hora_devolucao', type: 'timestamptz', nullable: true })
  dataHoraDevolucao: Date | null;

  @Column({ length: 255, nullable: true })
  observacoes: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: StatusEmprestimo.EMPRESTADA,
  })
  status: StatusEmprestimo;
}
