"use client"

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// A Supabase-ből érkező nyers adat formátuma
interface HistoryItem {
  scraped_at: string
  scraped_price: number | null
}

export function PriceHistoryChart({ data, competitorName }: { data: HistoryItem[], competitorName: string }) {
  // Ha nincs még adat (nulla leolvasás)
  if (!data || data.length === 0) {
    return (
      <div className="h-16 w-full flex items-center justify-center bg-slate-50 rounded-md border border-slate-100 border-dashed text-xs text-slate-400">
        Nincs még adat
      </div>
    )
  }

  // Adatok formázása a grafikon számára (Dátum rövidítése, null értékek kiszűrése)
  const chartData = data
    .filter(item => item.scraped_price !== null)
    .map(item => {
      const date = new Date(item.scraped_at)
      return {
        // Formátum: "Feb 27. 11:00"
        time: `${date.getMonth() + 1}. ${date.getDate()}. ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`,
        price: item.scraped_price,
        rawDate: date.getTime() // a sorbarendezéshez
      }
    })
    .sort((a, b) => a.rawDate - b.rawDate) // Időrendbe állítás

  // Trend számítása az ikonhoz
  const firstPrice = chartData[0]?.price || 0
  const lastPrice = chartData[chartData.length - 1]?.price || 0
  const isTrendingDown = lastPrice < firstPrice
  const isTrendingUp = lastPrice > firstPrice

  return (
    <div className="flex items-center gap-4">
      {/* Mini Trend Ikon */}
      <div className="flex-shrink-0">
        {isTrendingDown ? (
          <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md"><TrendingDown className="w-4 h-4" /></div>
        ) : isTrendingUp ? (
          <div className="p-1.5 bg-rose-100 text-rose-600 rounded-md"><TrendingUp className="w-4 h-4" /></div>
        ) : (
          <div className="p-1.5 bg-slate-100 text-slate-500 rounded-md"><Minus className="w-4 h-4" /></div>
        )}
      </div>

      {/* Recharts Vonaldiagram */}
      <div className="h-16 w-full min-w-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <YAxis domain={['dataMin', 'dataMax']} hide />
            <Tooltip
              formatter={(value) => [`${Number(value).toLocaleString('hu-HU')} Ft`, 'Ár']}
              labelStyle={{ display: 'none' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '4px 8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={isTrendingDown ? "#10b981" : isTrendingUp ? "#f43f5e" : "#64748b"}
              strokeWidth={2}
              dot={{ r: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}