import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ProfitHistoryPeriod, ProfitHistorySummary } from '@alitracker/shared';
import { useMemo, useState } from 'react';

import { getProfitHistory } from '@/api/metrics.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';

import { ProfitHistoryChart } from './profit-history-chart';

const ranges: Array<{ value: ProfitHistoryPeriod; label: string }> = [
  { value: 'month', label: 'Mes actual' },
  { value: 'year', label: 'Último año' },
];

type MonthOption = { value: string; label: string; monthLabel: string; year: string };
const projectStartMonth = new Date(Date.UTC(2026, 5, 1));

function capitalize(value: string): string {
  return `${value.charAt(0).toLocaleUpperCase('es-ES')}${value.slice(1)}`;
}

function getAvailableMonths(now = new Date()): MonthOption[] {
  const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long' });
  const yearFormatter = new Intl.DateTimeFormat('es-ES', { year: 'numeric' });
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return Array.from({ length: 12 }, (_, index) => {
    const month = new Date(currentMonth);
    month.setUTCMonth(month.getUTCMonth() - index);
    return month;
  })
    .filter((month) => month >= projectStartMonth)
    .map((month) => {
      const monthLabel = capitalize(monthFormatter.format(month));
      const year = yearFormatter.format(month);

      return {
        value: month.toISOString().slice(0, 7),
        label: `${monthLabel} ${year}`,
        monthLabel,
        year,
      };
    });
}

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 1,
});

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function ProfitHistorySummary({ summary }: { summary: ProfitHistorySummary }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Profit total</p>
        <p className="text-3xl font-semibold tracking-tight">
          {currencyFormatter.format(summary.profit)}
          <span className="ml-2 whitespace-nowrap text-base font-normal text-muted-foreground">
            ({summary.roi === null ? '—' : `${percentageFormatter.format(summary.roi)}%`} ROI)
          </span>
        </p>
      </div>
      <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <SummaryItem label="Número de ventas" value={summary.salesCount.toString()} />
        <SummaryItem label="Ingresos totales" value={currencyFormatter.format(summary.revenue)} />
        <SummaryItem label="COGS total" value={currencyFormatter.format(summary.cogs)} />
      </dl>
    </div>
  );
}

export function ProfitHistorySection() {
  const [period, setPeriod] = useState<ProfitHistoryPeriod>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>();
  const availableMonths = useMemo(() => getAvailableMonths(), []);
  const selectedMonthOption =
    availableMonths.find((option) => option.value === selectedMonth) ?? null;
  const profitHistoryQuery = useQuery({
    queryKey: ['profit-history', period, selectedMonth],
    queryFn: () => getProfitHistory(period, period === 'month' ? selectedMonth : undefined),
    placeholderData: keepPreviousData,
  });

  return (
    <section className="mt-6" aria-labelledby="profit-history-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="profit-history-title" className="text-xl font-semibold text-foreground">
            Grafico de beneficios
          </h2>
        </div>
        <div className="flex gap-2" aria-label="Rango de evolución de beneficios">
          <Combobox
            items={availableMonths}
            value={selectedMonthOption}
            onValueChange={(option) => {
              if (!option) return;
              setSelectedMonth(option.value);
              setPeriod('month');
            }}
            itemToStringLabel={(option) => option.label}
            itemToStringValue={(option) => option.value}
          >
            <ComboboxInput
              className="w-44"
              aria-label="Mes de evolución de beneficios"
              placeholder="Seleccionar mes"
              readOnly
            />
            <ComboboxContent>
              <ComboboxList>
                {(option: MonthOption) => (
                  <ComboboxItem key={option.value} value={option}>
                    <span>{option.monthLabel}</span>
                    <span className="text-muted-foreground">{option.year}</span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {ranges.map((range) => (
            <Button
              key={range.value}
              type="button"
              size="sm"
              variant={period === range.value ? 'default' : 'outline'}
              aria-pressed={period === range.value}
              onClick={() => {
                setPeriod(range.value);
                setSelectedMonth(undefined);
              }}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {profitHistoryQuery.isPending && <p role="status">Cargando evolución de beneficios…</p>}
      {profitHistoryQuery.isError && (
        <p className="text-destructive" role="alert">
          No se pudo cargar la evolución de beneficios.
        </p>
      )}
      {profitHistoryQuery.data && !profitHistoryQuery.isError && (
        <Card>
          <CardHeader>
            {/* <CardTitle>Profit realizado del periodo</CardTitle>
            <CardDescription>
              La línea superior muestra el profit acumulado durante el rango seleccionado.
            </CardDescription> */}
            <ProfitHistorySummary summary={profitHistoryQuery.data.summary} />
          </CardHeader>
          <CardContent className="space-y-6">
            <ProfitHistoryChart
              points={profitHistoryQuery.data.points}
              period={profitHistoryQuery.data.period}
            />
          </CardContent>
        </Card>
      )}
    </section>
  );
}
