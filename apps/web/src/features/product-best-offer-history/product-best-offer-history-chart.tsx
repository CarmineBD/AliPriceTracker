import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';

import type {
  BestOfferHistoryChartPoint,
  BestOfferHistoryRange,
} from './product-best-offer-history.types';
import { formatBestOfferPrice } from './product-best-offer-history.utils';

type ChartBounds = { min: number; max: number };
type AxisTick = { position: number; value: number };
type ChartDatum = BestOfferHistoryChartPoint & {
  pricePosition: number | null;
  stockPosition: number | null;
};
type TooltipPayload = { payload?: BestOfferHistoryChartPoint };

const PRICE_AREA = { start: 25, end: 100 };
const STOCK_AREA = { start: 0, end: 25 };

const chartConfig = {
  price: {
    label: 'Precio mínimo',
    color: 'var(--chart-2)',
  },
  quantityAvailable: {
    label: 'Stock ganador',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig;

function formatDate(timestamp: number, range: BestOfferHistoryRange): string {
  return new Intl.DateTimeFormat(
    'es-ES',
    range === '24h' ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short' },
  ).format(new Date(timestamp));
}

function formatTooltipDate(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function formatStock(value: number | null): string {
  if (value === null) return 'Sin oferta disponible';
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value);
}

function getBounds(values: Array<number | null>): ChartBounds | null {
  const validValues = values.filter((value): value is number => value !== null);
  if (validValues.length === 0) return null;

  return { min: Math.min(...validValues), max: Math.max(...validValues) };
}

function toPosition(
  value: number | null,
  bounds: ChartBounds | null,
  area: typeof PRICE_AREA,
): number | null {
  if (value === null || !bounds) return null;
  if (bounds.min === bounds.max) return (area.start + area.end) / 2;

  return area.start + ((value - bounds.min) / (bounds.max - bounds.min)) * (area.end - area.start);
}

function buildAxisTicks(bounds: ChartBounds | null, area: typeof PRICE_AREA): AxisTick[] {
  if (!bounds) return [];
  if (bounds.min === bounds.max) {
    return [{ position: (area.start + area.end) / 2, value: bounds.min }];
  }

  return [bounds.min, (bounds.min + bounds.max) / 2, bounds.max].map((value) => ({
    position: toPosition(value, bounds, area) ?? area.start,
    value,
  }));
}

function formatAxisTick(
  position: number,
  ticks: AxisTick[],
  formatter: (value: number) => string,
): string {
  const tick = ticks.reduce<AxisTick | null>((closest, candidate) => {
    if (
      !closest ||
      Math.abs(candidate.position - position) < Math.abs(closest.position - position)
    ) {
      return candidate;
    }
    return closest;
  }, null);

  return tick ? formatter(tick.value) : '';
}

function BestOfferTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="grid min-w-40 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium">{formatTooltipDate(point.timestamp)}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="h-1 w-1 rounded-full bg-(--color-price)" />
          Precio mínimo
        </span>
        <span className="font-mono font-medium tabular-nums">
          {formatBestOfferPrice(point.price, point.currency)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="h-1 w-1 rounded-full bg-(--color-quantityAvailable)" />
          Stock
        </span>
        <span className="font-mono font-medium tabular-nums">
          {formatStock(point.quantityAvailable)}
        </span>
      </div>
    </div>
  );
}

export function ProductBestOfferHistoryChart({
  data,
  range,
  currency,
}: {
  data: BestOfferHistoryChartPoint[];
  range: BestOfferHistoryRange;
  currency: string | null;
}) {
  const priceBounds = getBounds(data.map((point) => point.price));
  const stockBounds = getBounds(data.map((point) => point.quantityAvailable));
  const priceTicks = buildAxisTicks(priceBounds, PRICE_AREA);
  const stockTicks = buildAxisTicks(stockBounds, STOCK_AREA);
  const chartData: ChartDatum[] = data.map((point) => ({
    ...point,
    pricePosition: toPosition(point.price, priceBounds, PRICE_AREA),
    stockPosition: toPosition(point.quantityAvailable, stockBounds, STOCK_AREA),
  }));

  return (
    <div className="relative h-[28rem] w-full">
      <span className="pointer-events-none absolute top-[37.5%] left-1 z-10 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground">
        Precio
      </span>
      <span className="pointer-events-none absolute top-[87.5%] left-1 z-10 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground">
        Stock
      </span>
      <ChartContainer
        config={chartConfig}
        className="h-full w-full aspect-auto"
        aria-label="Gráfica de histórico de mejor oferta"
      >
        <LineChart data={chartData} margin={{ top: 12, right: 62, bottom: 8, left: 74 }}>
          <CartesianGrid vertical={false} horizontal={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(timestamp: number) => formatDate(timestamp, range)}
            minTickGap={28}
          />
          <YAxis yAxisId="layout" domain={[0, 100]} hide />
          <YAxis
            yAxisId="price-labels"
            domain={[0, 100]}
            ticks={priceTicks.map((tick) => tick.position)}
            tickFormatter={(position: number) =>
              formatAxisTick(position, priceTicks, (value) => formatBestOfferPrice(value, currency))
            }
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <YAxis
            yAxisId="stock-labels"
            orientation="right"
            domain={[0, 100]}
            ticks={stockTicks.map((tick) => tick.position)}
            tickFormatter={(position: number) =>
              formatAxisTick(position, stockTicks, (value) => formatStock(value))
            }
            axisLine={false}
            tickLine={false}
            width={58}
          />
          <ReferenceLine yAxisId="layout" y={25} stroke="var(--border)" />
          <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<BestOfferTooltip />} />
          <Line
            yAxisId="layout"
            type="stepAfter"
            dataKey="pricePosition"
            name="price"
            stroke="var(--color-price)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="layout"
            type="stepAfter"
            dataKey="stockPosition"
            name="quantityAvailable"
            stroke="var(--color-quantityAvailable)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
