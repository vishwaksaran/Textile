'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatINR } from '@/lib/utils';
import type { RevenuePoint } from '@/lib/admin-data';

const MAROON = '#4A0404';
const GOLD = '#d4af37';

/** Paid revenue over the last 30 days. */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const hasRevenue = data.some((d) => d.revenue > 0);

  return (
    <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-5">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="font-headline-md text-headline-md text-deep-maroon">Revenue</h2>
        <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
          Last 30 days
        </span>
      </div>

      {hasRevenue ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#d0c5af" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) =>
                  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                }
                tick={{ fill: '#4d4635', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#d0c5af' }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(value: number) =>
                  value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
                }
                tick={{ fill: '#4d4635', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  background: '#FFFDF5',
                  border: '1px solid #d4af37',
                  borderRadius: 4,
                  fontSize: 12,
                }}
                labelFormatter={(value) =>
                  new Date(value as string).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                  })
                }
                formatter={(value: number, name) =>
                  name === 'revenue' ? [formatINR(value), 'Revenue'] : [value, 'Orders']
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={MAROON}
                strokeWidth={2}
                fill="url(#revenueFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded border border-dashed border-outline-variant">
          <p className="font-body-md text-body-md text-on-surface-variant">
            No paid orders in the last 30 days yet.
          </p>
        </div>
      )}
    </div>
  );
}
