import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export type SubFilterType = 'ALL' | 'CATEGORY' | 'KEYWORD';

@Entity('subscriptions')
@Index(['user', 'type', 'query'], { unique: true })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) // ensure column name matches migration
  user!: User;

  @Column({ type: 'varchar', length: 16 })
  type!: SubFilterType;

  @Column({ type: 'varchar', length: 256, nullable: true })
  query!: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
