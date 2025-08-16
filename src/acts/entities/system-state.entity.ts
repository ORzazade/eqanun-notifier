import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('system_state')
export class SystemState {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key!: string;

  @Column({ type: 'varchar', length: 256 })
  value!: string;
}
