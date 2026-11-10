import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Emprestimo } from '../emprestimos/emprestimo.entity';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';

@Entity('administrador')
export class Administrador {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  nome: string;

  @Column({ length: 80, unique: true })
  login: string;

  @Column({ length: 20 })
  perfil: PerfilAdministrador;

  @Column({ default: true })
  ativo: boolean;

  @OneToMany(() => Emprestimo, (emprestimo) => emprestimo.administrador)
  emprestimos: Emprestimo[];
}
