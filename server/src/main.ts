import { serve } from '@hono/node-server';
import { API_PREFIX, createApp } from './app';
import { loadConfig } from './config';
import { openDatabase } from './db';
import { createLogger } from './log';

const logger = createLogger();
const config = loadConfig(process.env);
const database = await openDatabase(config.database);
// One instance: pending migrations are applied on start (see docs/02-architecture/backend.md).
const applied = await database.migrate();
if (applied.length > 0) logger.info('migrations applied', { applied });
const app = createApp({ config, logger });

serve({ fetch: app.fetch, port: config.port }, (info) => {
  logger.info('server started', {
    url: `http://localhost:${info.port}${API_PREFIX}`,
    env: config.env,
    appOrigin: config.appOrigin,
  });
});
