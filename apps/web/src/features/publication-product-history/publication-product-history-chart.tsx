import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { HistoryChartPoint, HistoryRange } from './publication-product-history.types';
import { formatPrice } from './publication-product-history.utils';

type PublicationProductHistoryChartProps = {
  data: HistoryChartPoint[];
  range: HistoryRange;
  currency: string | null;
};

function formatAxisDate(timestamp: number, range: HistoryRange): string {
  return new Intl.DateTimeFormat(
    'es-ES',
    range === '24h' ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short' },
  ).format(new Date(timestamp));
}

function formatTooltipDate(timestamp: number): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

type TooltipPayload = {
  payload?: HistoryChartPoint;
};

function HistoryTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-sm">
      <p className="font-medium">{formatTooltipDate(point.timestamp)}</p>
      <p className="mt-1 text-[#2563eb]">Precio: {formatPrice(point.price, point.currency)}</p>
      <p className="text-[#16a34a]">Stock: {point.quantityAvailable ?? '—'}</p>
    </div>
  );
}

export function PublicationProductHistoryChart({
  data,
  range,
  currency,
}: PublicationProductHistoryChartProps) {
  return (
    <div className="h-80 w-full" aria-label="Gráfica de histórico de precio y stock">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(timestamp: number) => formatAxisDate(timestamp, range)}
            minTickGap={28}
          />
          <YAxis
            yAxisId="price"
            tickFormatter={(price: number) => formatPrice(price, currency)}
            width={74}
            label={{ value: 'Precio', angle: -90, position: 'insideLeft' }}
          />
          <YAxis
            yAxisId="stock"
            orientation="right"
            allowDecimals={false}
            width={52}
            label={{ value: 'Stock', angle: 90, position: 'insideRight' }}
          />
          <Tooltip content={<HistoryTooltip />} />
          <Legend />
          <Line
            yAxisId="price"
            type="stepAfter"
            dataKey="price"
            name="Precio"
            stroke="#2563eb"
            strokeWidth={2}
            dot={data.length === 1 ? { r: 3 } : false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="stock"
            type="stepAfter"
            dataKey="quantityAvailable"
            name="Stock"
            stroke="#16a34a"
            strokeWidth={2}
            dot={data.length === 1 ? { r: 3 } : false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
