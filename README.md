# E-qanun Notifier (NestJS + PostgreSQL + TypeORM + Telegram)

Tracks new/updated legal acts on https://e-qanun.az and notifies subscribers via Telegram with flexible filters.

## Quick start

1. Copy `.env.example` to `.env` and set `TELEGRAM_BOT_TOKEN`.
2. Run Postgres (Docker Compose provided).
3. `npm i`
4. `npm run build`
5. `npm run start:dev` (or `docker compose up --build`)

On first start, TypeORM will run migrations automatically (configured in `AppModule`).

## Env

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/eqanun
DB_SSL=false
TELEGRAM_BOT_TOKEN=123456:ABC
TZ=Asia/Baku
```

## Telegram

- Talk to @BotFather, create a bot, get token.
- DM your bot `/start` then manage filters:
  - `/subscribe all`
  - `/subscribe category LAW|DECREE|DECISION`
  - `/subscribe keyword <word>`
  - `/list`
  - `/unsubscribe <filter>`

## Schedules

- Scrape new acts **09:00 and 18:00 Asia/Baku**.
- Plan notifications every **5 minutes**.
- Send notifications every **1 minute**.

## Notes

- Selectors in the scraper are heuristics and may need minor adjustments.
- Outbox pattern ensures reliability; failed sends retry up to 5 times.
