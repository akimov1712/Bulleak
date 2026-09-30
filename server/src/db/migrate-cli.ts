/** `npm run db:migrate -w server`: applies pending migrations to DATABASE_URL (or local PGlite). */
import { loadConfig } from '../config';
import { createLogger } from '../log';
import { openDatabase } from './index';

const logger = createLogger();
const database = await openDatabase(loadConfig(process.env).database);
try {
  const applied = await database.migrate();
  logger.info(applied.length > 0 ? 'migrations applied' : 'database is up to date', { applied });
} finally {
  await database.close();
}
