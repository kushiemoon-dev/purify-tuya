import { useTranslation } from 'react-i18next'
import type { TimeRange } from '@/shared/lib/types'

const RANGES: readonly TimeRange[] = ['1h', '24h', '7d', '30d']

interface TimeRangeSelectorProps {
  readonly value: TimeRange
  readonly onChange: (range: TimeRange) => void
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="time-range-selector">
      {RANGES.map((range) => (
        <button
          key={range}
          className={`pill ${range === value ? 'active' : ''}`}
          onClick={() => onChange(range)}
        >
          {t(`history.range.${range}`)}
        </button>
      ))}
    </div>
  )
}
