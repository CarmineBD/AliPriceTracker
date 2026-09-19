import { describe, expect, it } from 'vitest';

import { formatRelativeExecutionTime } from './publication-product-changes.utils';

const now = new Date('2026-09-19T12:00:00.000Z');

function changedAt(millisecondsAgo: number): string {
  return new Date(now.getTime() - millisecondsAgo).toISOString();
}

describe('formatRelativeExecutionTime', () => {
  it.each([
    [59_000, 'Hace 59 segundos'],
    [60_000, 'Hace 1 minuto'],
    [59 * 60_000, 'Hace 59 minutos'],
    [60 * 60_000, 'Hace 1 hora'],
    [23 * 60 * 60_000, 'Hace 23 horas'],
    [24 * 60 * 60_000, 'Hace 1 día'],
    [29 * 24 * 60 * 60_000, 'Hace 29 días'],
    [30 * 24 * 60 * 60_000, 'Hace 1 mes'],
    [364 * 24 * 60 * 60_000, 'Hace 12 meses'],
    [365 * 24 * 60 * 60_000, 'Hace 1 año'],
    [395 * 24 * 60 * 60_000, 'Hace 1 año y 1 mes'],
  ])('formats %d milliseconds ago as %s', (millisecondsAgo, expected) => {
    expect(formatRelativeExecutionTime(changedAt(millisecondsAgo), now)).toBe(expected);
  });

  it('does not report a negative duration for a future change', () => {
    expect(formatRelativeExecutionTime('2026-09-19T12:01:00.000Z', now)).toBe('Hace 0 segundos');
  });
});
