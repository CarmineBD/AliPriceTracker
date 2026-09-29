export function calculateRoi(profit: number, cost: number): number | null {
  if (!Number.isFinite(cost) || cost <= 0) return null;
  return Math.round((profit / cost) * 10_000) / 100;
}
