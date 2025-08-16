import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000000 implements MigrationInterface {
  name = 'Init1700000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await q.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await q.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        telegram_chat_id bigint NOT NULL UNIQUE,
        locale varchar(8) NOT NULL DEFAULT 'az',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS legal_acts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        eqanun_id int NOT NULL UNIQUE,
        published_date date,
        category varchar(256) NOT NULL,
        title varchar(1024) NOT NULL,
        summary text,
        url varchar(1024) NOT NULL,
        content_hash varchar(64),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS act_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        act_id uuid NOT NULL REFERENCES legal_acts(id) ON DELETE CASCADE,
        type varchar(16) NOT NULL,
        detected_at timestamptz NOT NULL DEFAULT now(),
        snapshot jsonb
      );
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_act_events_type ON act_events(type)`);

    await q.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type varchar(16) NOT NULL,
        query varchar(256),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, type, query)
      );
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS outbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        kind varchar(32) NOT NULL,
        payload jsonb NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'NEW',
        attempts int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_outbox_status_kind ON outbox(status, kind)`);

    await q.query(`
      CREATE TABLE IF NOT EXISTS system_state (
        key varchar(64) PRIMARY KEY,
        value varchar(256) NOT NULL
      );
    `);

    await q.query(`CREATE INDEX IF NOT EXISTS idx_acts_category ON legal_acts(category)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_acts_title_trgm ON legal_acts USING GIN (title gin_trgm_ops)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS system_state`);
    await q.query(`DROP INDEX IF EXISTS idx_acts_title_trgm`);
    await q.query(`DROP INDEX IF EXISTS idx_acts_category`);
    await q.query(`DROP TABLE IF EXISTS outbox`);
    await q.query(`DROP INDEX IF EXISTS idx_act_events_type`);
    await q.query(`DROP TABLE IF EXISTS act_events`);
    await q.query(`DROP TABLE IF EXISTS legal_acts`);
    await q.query(`DROP TABLE IF EXISTS subscriptions`);
    await q.query(`DROP TABLE IF EXISTS users`);
    await q.query(`DROP EXTENSION IF EXISTS pg_trgm`);
    await q.query(`DROP EXTENSION IF EXISTS pgcrypto`);
  }
}
