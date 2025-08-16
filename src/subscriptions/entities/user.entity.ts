import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('users')
@Unique(['telegramChatId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'bigint', name: 'telegram_chat_id' })
  telegramChatId!: string;

  @Column({ type: 'varchar', length: 8, default: 'az' })
  locale!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
