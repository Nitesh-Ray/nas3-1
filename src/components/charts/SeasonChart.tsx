import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatPercent, type SeasonPoint } from '../../lib/data-utils'
import { axisTick, tooltipStyle } from './chart-style'

const LABEL: Record<string, string> = {
  Q1: 'Q1 (Apr–Jun)',
  Q2: 'Q2 (Jul–Sep)',
  Q3: 'Q3 (Oct–Dec)',
  Q4: 'Q4 (Jan–Mar)',
}

// Har quarter saal ke average se kitna upar (+) ya neeche (-) rehta hai
export default function SeasonChart({ data }: { data: SeasonPoint[] }) {
  const rows = data.map((d) => ({ ...d, name: LABEL[d.quarter] ?? d.quarter }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--muted)" strokeOpacity={0.25} vertical={false} />
        <XAxis dataKey="name" tick={axisTick} />
        <YAxis tick={axisTick} tickFormatter={(v: number) => `${v}%`} width={44} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => formatPercent(Number(v), 2)}
          cursor={{ fill: 'var(--muted)', fillOpacity: 0.15 }}
        />
        <ReferenceLine y={0} stroke="var(--line)" />
        <Bar dataKey="deviation" name="vs yearly average" isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.quarter} fill={r.deviation >= 0 ? 'var(--credit)' : 'var(--debit)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
