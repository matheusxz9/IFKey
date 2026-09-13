import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Emprestimo } from '../emprestimos/emprestimo.entity';

@Entity('solicitante')
export class Solicitante {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  nome: string;

  @Column({ length: 20 })
  tipo: string;

  @Column({ length: 30, unique: true })
  matricula: string;

  @Column({ length: 120, nullable: true })
  contato: string;

  @Column({ default: true })
  ativo: boolean;

  @OneToMany(() => Emprestimo, (emprestimo) => emprestimo.solicitante)
  emprestimos: Emprestimo[];
}
