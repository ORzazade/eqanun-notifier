import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { LegalAct } from './legal-act.entity';

export type ActEventType = 'CREATED' | 'UPDATED';

@Entity('act_events')
export class ActEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => LegalAct, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'act_id' }) // map to existing column
  act!: LegalAct;

  @Index()
  @Column({ type: 'varchar', length: 16 })
  type!: ActEventType;

  @CreateDateColumn({ name: 'detected_at' })
  detectedAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  snapshot!: any;
}
