const second = 1_000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const month = 30 * day;
const year = 365 * day;

function pluralize(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

/** Formats elapsed time using the product's requested seconds-to-years thresholds. */
export function formatRelativeExecutionTime(changedAt: string, now = new Date()): string {
  const elapsed = Math.max(0, now.getTime() - new Date(changedAt).getTime());

  if (elapsed < minute)
    return `Hace ${pluralize(Math.floor(elapsed / second), 'segundo', 'segundos')}`;
  if (elapsed < hour) return `Hace ${pluralize(Math.floor(elapsed / minute), 'minuto', 'minutos')}`;
  if (elapsed < day) return `Hace ${pluralize(Math.floor(elapsed / hour), 'hora', 'horas')}`;
  if (elapsed < month) return `Hace ${pluralize(Math.floor(elapsed / day), 'día', 'días')}`;
  if (elapsed < year) return `Hace ${pluralize(Math.floor(elapsed / month), 'mes', 'meses')}`;

  const years = Math.floor(elapsed / year);
  const months = Math.floor((elapsed % year) / month);
  const yearText = pluralize(years, 'año', 'años');
  return months === 0
    ? `Hace ${yearText}`
    : `Hace ${yearText} y ${pluralize(months, 'mes', 'meses')}`;
}
