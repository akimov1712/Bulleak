import { serve } from '@hono/node-server';
import { API_PREFIX, createApp } from './app';
import { loadConfig } from './config';
import { createLogger } from './log';

const logger = createLogger();
const config = loadConfig(process.env);
const app = createApp({ config, logger });

serve({ fetch: app.fetch, port: config.port }, (info) => {
  logger.info('server started', {
    url: `http://localhost:${info.port}${API_PREFIX}`,
    env: config.env,
    appOrigin: config.appOrigin,
  });
});
