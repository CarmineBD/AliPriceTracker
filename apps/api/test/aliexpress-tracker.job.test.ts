import { describe, expect, it, vi } from 'vitest';

import { runAliExpressTrackerJob } from '../src/jobs/aliexpress-tracker.runner';

const completedResult = {
  publications: { total: 1, processed: 1, failed: 0 },
  products: { tracked: 1, initialSnapshots: 0, changed: 0, unchanged: 1, missing: 0 },
  aborted: false,
};

describe('runAliExpressTrackerJob', () => {
  it('closes the database and succeeds when individual publication failures were handled', async () => {
    const closeDatabase = vi.fn().mockResolvedValue(undefined);

    await expect(
      runAliExpressTrackerJob({
        track: async () => ({
          ...completedResult,
          publications: { total: 2, processed: 1, failed: 1 },
        }),
        closeDatabase,
      }),
    ).resolves.toBe(0);

    expect(closeDatabase).toHaveBeenCalledOnce();
  });

  it('returns a failure code after a global abort and still closes the database', async () => {
    const closeDatabase = vi.fn().mockResolvedValue(undefined);

    await expect(
      runAliExpressTrackerJob({
        track: async () => ({ ...completedResult, aborted: true }),
        closeDatabase,
      }),
    ).resolves.toBe(1);

    expect(closeDatabase).toHaveBeenCalledOnce();
  });

  it('returns a failure code and closes the database when tracking throws', async () => {
    const closeDatabase = vi.fn().mockResolvedValue(undefined);
    const logger = { error: vi.fn() };

    await expect(
      runAliExpressTrackerJob({
        track: async () => {
          throw new Error('database unavailable');
        },
        closeDatabase,
        logger,
      }),
    ).resolves.toBe(1);

    expect(closeDatabase).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
