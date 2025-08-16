import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type OutboxKind = 'NEW_ACTS_DETECTED' | 'USER_NOTIFICATION';
export type OutboxStatus = 'NEW' | 'SENT' | 'FAILED';

@Entity('outbox')
@Index(['status', 'kind'])
export class Outbox {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  kind!: OutboxKind;

  @Column({ type: 'jsonb' })
  payload!: any;

  @Column({ type: 'varchar', length: 16, default: 'NEW' })
  status!: OutboxStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
