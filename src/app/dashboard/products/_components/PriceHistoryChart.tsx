'use client'

import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface Props {
  data: { scraped_price: number; scraped_at: string }[]
  competitorName: string
}

export function PriceHistoryChart({ data, competitorName }: Props) {
  const formatted = data.map(d => ({
    date: new Date(d.scraped_at).toLocaleDateString('hu-HU', {
      month: 'short', day: 'numeric'
    }),
    price: Number(d.scraped_price),
  }))

  if (formatted.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Még nincs árelőzmény
      </div>
    )
  }

  return (
    <div className="mt-2">
      <p className="text-xs text-muted-foreground mb-2">{competitorName} — árelőzmény</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={60} />
          <Tooltip
            formatter={(value: number | undefined) => [
  value != null ? `${value.toLocaleString('hu-HU')} Ft` : '—', 'Ár'
]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}