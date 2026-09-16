import type { AliExpressTrackerResult } from '../modules/aliexpress-tracker/aliexpress-tracker.service';

type JobLogger = Pick<Console, 'error'>;

export async function runAliExpressTrackerJob({
  track,
  closeDatabase,
  logger = console,
}: {
  track: () => Promise<AliExpressTrackerResult>;
  closeDatabase: () => Promise<void>;
  logger?: JobLogger;
}): Promise<number> {
  let exitCode = 0;

  try {
    const result = await track();
    if (result.aborted) {
      exitCode = 1;
    }
  } catch (error) {
    logger.error(error);
    exitCode = 1;
  }

  try {
    await closeDatabase();
  } catch (error) {
    logger.error(error);
    exitCode = 1;
  }

  return exitCode;
}
