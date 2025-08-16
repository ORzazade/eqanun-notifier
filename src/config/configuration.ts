export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  dbUrl: process.env.DATABASE_URL,
  dbSsl: process.env.DB_SSL === 'true',
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  timezone: process.env.TZ ?? 'Asia/Baku',
});
