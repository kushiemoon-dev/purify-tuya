import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchDeviceHistory } from '@/shared/lib/api'
import type { HistoryPoint, TimeRange } from '@/shared/lib/types'
import { TimeRangeSelector } from './TimeRangeSelector'

interface HistoryChartProps {
  readonly deviceId: number
}

function formatTime(ts: number, range: TimeRange): string {
  const d = new Date(ts * 1000)
  if (range === '1h' || range === '24h') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatTooltipTime(ts: number): string {
  const d = new Date(ts * 1000)
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistoryChart({ deviceId }: HistoryChartProps) {
  const { t } = useTranslation()
  const [range, setRange] = useState<TimeRange>('24h')
  const [data, setData] = useState<readonly HistoryPoint[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchDeviceHistory(deviceId, 'humidity_current', range)
      setData(res.data)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [deviceId, range])

  useEffect(() => {
    load()
  }, [load])

  const handleRangeChange = useCallback((newRange: TimeRange) => {
    setRange(newRange)
  }, [])

  return (
    <div className="card history-card">
      <div className="card-header">
        <span className="card-label">{t('history.title')}</span>
      </div>
      <TimeRangeSelector value={range} onChange={handleRangeChange} />
      <div className="history-chart-container">
        {loading ? (
          <div className="history-chart-loading">
            <div className="spinner" />
          </div>
        ) : data.length === 0 ? (
          <div className="history-chart-empty">{t('history.noData')}</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={[...data]} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="t"
                tickFormatter={(ts) => formatTime(ts, range)}
                stroke="var(--text-secondary)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                stroke="var(--text-secondary)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 5', 'dataMax + 5']}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '10px',
                  backdropFilter: 'blur(12px)',
                  fontSize: '13px',
                  padding: '8px 12px',
                  color: 'var(--text)',
                }}
                labelFormatter={(ts) => formatTooltipTime(ts as number)}
                formatter={(value) => [`${value}%`, t('history.humidity')]}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#humidityGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: 'var(--primary)',
                  stroke: 'white',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
