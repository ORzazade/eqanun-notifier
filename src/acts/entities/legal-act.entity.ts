import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity('legal_acts')
@Unique(['eqanunId'])
export class LegalAct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'int', name: 'eqanun_id' }) // mapped to existing column
  eqanunId!: number;

  @Index()
  @Column({ type: 'date', nullable: true, name: 'published_date' }) // mapped
  publishedDate!: Date | null;

  @Index()
  @Column({ type: 'varchar', length: 256 })
  category!: string;

  @Column({ type: 'text' }) // changed from varchar(1024) to text
  title!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'varchar', length: 1024 })
  url!: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'content_hash' }) // mapped
  contentHash!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
