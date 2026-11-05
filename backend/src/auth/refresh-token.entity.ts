import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('refresh_token')
@Index('UQ_refresh_token_tokenHash', ['tokenHash'], { unique: true })
@Index('IDX_refresh_token_user', ['userId', 'userType'])
@Index('IDX_refresh_token_family', ['familyId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  tokenHash: string;

  @Column({ type: 'int' })
  userId: number;

  @Column({ length: 20 })
  userType: string; // 'admin' | 'solicitante'

  @Column({
    name: 'familyId',
    type: 'uuid',
    default: () => 'gen_random_uuid()',
  })
  familyId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date;
}
