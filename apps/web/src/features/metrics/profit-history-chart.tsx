import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts';

import type { ProfitHistoryPeriod, ProfitHistoryPoint } from '@alitracker/shared';

import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';

type ChartBounds = { min: number; max: number };
type AxisTick = { position: number; value: number };
type ChartDatum = ProfitHistoryPoint & {
  timestamp: number;
  profitPosition: number;
  cumulativeProfitPosition: number;
};
type TooltipPayload = { payload?: ChartDatum };

const PROFIT_AREA = { start: 0, end: 18 };
const CUMULATIVE_PROFIT_AREA = { start: 28, end: 100 };

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 1,
});

const chartConfig = {
  profit: {
    label: 'Profit realizado del periodo',
    color: 'var(--chart-2)',
  },
  cumulativeProfit: {
    label: 'Profit acumulado',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig;

function getBounds(values: number[]): ChartBounds {
  return { min: Math.min(...values), max: Math.max(...values) };
}

function toPosition(value: number, bounds: ChartBounds, area: typeof PROFIT_AREA): number {
  if (bounds.min === bounds.max) return (area.start + area.end) / 2;
  return area.start + ((value - bounds.min) / (bounds.max - bounds.min)) * (area.end - area.start);
}

function buildAxisTicks(bounds: ChartBounds, area: typeof PROFIT_AREA): AxisTick[] {
  if (bounds.min === bounds.max) {
    return [{ position: (area.start + area.end) / 2, value: bounds.min }];
  }

  return [bounds.min, (bounds.min + bounds.max) / 2, bounds.max].map((value) => ({
    position: toPosition(value, bounds, area),
    value,
  }));
}

function formatAxisTick(position: number, ticks: AxisTick[]): string {
  const tick = ticks.reduce<AxisTick | null>((closest, candidate) => {
    if (
      !closest ||
      Math.abs(candidate.position - position) < Math.abs(closest.position - position)
    ) {
      return candidate;
    }
    return closest;
  }, null);

  return tick ? currencyFormatter.format(tick.value) : '';
}

function formatAxisDate(timestamp: number, period: ProfitHistoryPeriod): string {
  return new Intl.DateTimeFormat(
    'es-ES',
    period === 'month' ? { day: '2-digit', month: 'short' } : { month: 'short', year: '2-digit' },
  ).format(new Date(timestamp));
}

function formatTooltipDate(timestamp: number, period: ProfitHistoryPeriod) {
  const date = new Date(timestamp);
  const month = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(date);
  const year = new Intl.DateTimeFormat('es-ES', { year: 'numeric' }).format(date);
  const monthLabel = `${month.charAt(0).toLocaleUpperCase('es-ES')}${month.slice(1)}`;

  return {
    main:
      period === 'month'
        ? `${new Intl.DateTimeFormat('es-ES', { day: '2-digit' }).format(date)} ${monthLabel}`
        : monthLabel,
    year,
  };
}

function formatSignedProfit(profit: number): string {
  const sign = profit >= 0 ? '+' : '−';
  return `${sign}${currencyFormatter.format(Math.abs(profit))}`;
}

function ProfitHistoryTooltip({
  active,
  payload,
  period,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  period: ProfitHistoryPeriod;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  const roi = point.cogs === 0 ? null : (point.profit / point.cogs) * 100;
  const date = formatTooltipDate(point.timestamp, period);

  return (
    <div className="grid min-w-48 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium">
        {date.main} <span className="font-normal text-muted-foreground">{date.year}</span>
      </p>
      <TooltipRow
        label="Profit"
        value={formatSignedProfit(point.profit)}
        valueClassName="text-emerald-600 dark:text-emerald-400"
      />
      <TooltipRow
        label="Profit acumulado"
        value={currencyFormatter.format(point.cumulativeProfit)}
      />
      <TooltipRow label="Ventas" value={point.salesCount.toString()} />
      <TooltipRow label="Ingresos" value={currencyFormatter.format(point.revenue)} />
      <TooltipRow label="Gasto de lo vendido" value={currencyFormatter.format(point.cogs)} />
      {period === 'year' && (
        <TooltipRow
          label="ROI"
          value={roi === null ? '—' : `${percentageFormatter.format(roi)}%`}
        />
      )}
    </div>
  );
}

function TooltipRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-medium tabular-nums ${valueClassName ?? ''}`}>{value}</span>
    </div>
  );
}

export function ProfitHistoryChart({
  points,
  period,
}: {
  points: ProfitHistoryPoint[];
  period: ProfitHistoryPeriod;
}) {
  const profitBounds = getBounds(points.map((point) => point.profit));
  const cumulativeProfitBounds = getBounds(points.map((point) => point.cumulativeProfit));
  const profitTicks = buildAxisTicks(profitBounds, PROFIT_AREA);
  const cumulativeProfitTicks = buildAxisTicks(cumulativeProfitBounds, CUMULATIVE_PROFIT_AREA);
  const referencePositions = [
    cumulativeProfitTicks[0]?.position,
    cumulativeProfitTicks.at(-1)?.position,
    profitTicks[0]?.position,
    profitTicks.at(-1)?.position,
  ].filter((position): position is number => position !== undefined);
  const data: ChartDatum[] = points.map((point) => ({
    ...point,
    timestamp: new Date(point.date).getTime(),
    profitPosition: toPosition(point.profit, profitBounds, PROFIT_AREA),
    cumulativeProfitPosition: toPosition(
      point.cumulativeProfit,
      cumulativeProfitBounds,
      CUMULATIVE_PROFIT_AREA,
    ),
  }));

  return (
    <div className="relative h-[28rem] w-full">
      <span className="pointer-events-none absolute top-[36%] left-1 z-10 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground">
        Acumulado
      </span>
      <span className="pointer-events-none absolute top-[91%] left-1 z-10 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground">
        Profit realizado
      </span>
      <ChartContainer
        config={chartConfig}
        className="h-full w-full aspect-auto"
        aria-label="Gráfica de evolución de beneficios"
      >
        <ComposedChart data={data} margin={{ top: 12, right: 70, bottom: 8, left: 74 }}>
          <CartesianGrid vertical={false} horizontal={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(timestamp: number) => formatAxisDate(timestamp, period)}
            minTickGap={28}
          />
          <YAxis yAxisId="layout" domain={[0, 100]} hide />
          <YAxis
            yAxisId="cumulative-profit-labels"
            domain={[0, 100]}
            ticks={cumulativeProfitTicks.map((tick) => tick.position)}
            tickFormatter={(position: number) => formatAxisTick(position, cumulativeProfitTicks)}
            axisLine={false}
            tickLine
            width={70}
          />
          <YAxis
            yAxisId="profit-labels"
            orientation="right"
            domain={[0, 100]}
            ticks={profitTicks.map((tick) => tick.position)}
            tickFormatter={(position: number) => formatAxisTick(position, profitTicks)}
            axisLine={false}
            tickLine
            width={66}
          />
          <ReferenceLine yAxisId="layout" y={22} stroke="var(--border)" />
          {[...new Set(referencePositions)].map((position) => (
            <ReferenceLine
              key={position}
              yAxisId="layout"
              y={position}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
          ))}
          <ChartTooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={<ProfitHistoryTooltip period={period} />}
          />
          <Bar
            yAxisId="layout"
            dataKey="profitPosition"
            name="profit"
            fill="var(--color-profit)"
            fillOpacity={0.85}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            yAxisId="layout"
            type="linear"
            dataKey="cumulativeProfitPosition"
            name="cumulativeProfit"
            stroke="var(--color-cumulativeProfit)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
