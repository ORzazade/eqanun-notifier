import * as Joi from 'joi';

export function validateEnv(config: Record<string, unknown>) {
  const schema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    DATABASE_URL: Joi.string().uri().required(),
    DB_SSL: Joi.string().valid('true', 'false').default('false'),
    TELEGRAM_BOT_TOKEN: Joi.string().required(),
    TZ: Joi.string().default('Asia/Baku'),
  });
  const { error, value } = schema.validate(config, { allowUnknown: true, abortEarly: false });
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }
  return value;
}
