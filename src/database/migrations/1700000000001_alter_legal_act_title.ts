import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterLegalActTitle1700000000001 implements MigrationInterface {
  name = 'AlterLegalActTitle1700000000001';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE legal_acts ALTER COLUMN title TYPE text`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE legal_acts ALTER COLUMN title TYPE varchar(1024) USING substring(title,1,1024)`);
  }
}
