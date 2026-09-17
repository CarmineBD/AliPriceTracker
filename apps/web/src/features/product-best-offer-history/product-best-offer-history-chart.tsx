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

import type {
  BestOfferHistoryChartPoint,
  BestOfferHistoryRange,
} from './product-best-offer-history.types';
import { formatBestOfferPrice } from './product-best-offer-history.utils';

function formatDate(timestamp: number, range: BestOfferHistoryRange) {
  return new Intl.DateTimeFormat(
    'es-ES',
    range === '24h' ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short' },
  ).format(new Date(timestamp));
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
  return (
    <div className="h-80 w-full" aria-label="Gráfica de histórico de mejor oferta">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value: number) => formatDate(value, range)}
            minTickGap={28}
          />
          <YAxis
            yAxisId="price"
            tickFormatter={(value: number) => formatBestOfferPrice(value, currency)}
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
          <Tooltip
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as BestOfferHistoryChartPoint | undefined;
              if (!active || !point) return null;
              return (
                <div className="rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-sm">
                  <p className="font-medium">
                    {new Intl.DateTimeFormat('es-ES', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(point.timestamp))}
                  </p>
                  <p>Precio: {formatBestOfferPrice(point.price, point.currency)}</p>
                  <p>Stock: {point.quantityAvailable ?? 'Sin oferta disponible'}</p>
                </div>
              );
            }}
          />
          <Legend />
          <Line
            yAxisId="price"
            type="stepAfter"
            dataKey="price"
            name="Precio mínimo"
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
            name="Stock ganador"
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
