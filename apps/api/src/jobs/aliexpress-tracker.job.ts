import { closeDatabase } from '../db/client';
import { trackAllAliExpressPublications } from '../modules/aliexpress-tracker/aliexpress-tracker.service';

try {
  const result = await trackAllAliExpressPublications();
  if (result.aborted) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
