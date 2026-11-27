import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCrore } from '../../lib/data-utils'
import { axisTick, tooltipStyle } from './chart-style'

export interface TrendPoint {
  label: string
  constant: number // asli growth (mehngai hata ke)
  current: number | null // us saal ke bhaav
}

// Current vs constant price: dono ke beech ka gap = mehngai ka asar
export default function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--muted)" strokeOpacity={0.25} vertical={false} />
        <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" minTickGap={30} />
        <YAxis tick={axisTick} tickFormatter={(v: number) => `${(v / 1e5).toFixed(0)}L`} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCrore(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} />
        <Line dataKey="constant" name="Constant price" stroke="var(--ink)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line
          dataKey="current"
          name="Current price"
          stroke="var(--credit)"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
