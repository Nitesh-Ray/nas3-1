import QueryState from './QueryState'
import { useAnomalies, useReview } from '../hooks/useApi'
import { formatCrore } from '../lib/data-utils'

// Human-in-the-loop: flag hui rows ko approve (sahi) ya reject (galat) karo
export default function AnomalyTable() {
  const q = useAnomalies(10, 0)
  const review = useReview()

  if (q.isPending || q.error) return <QueryState isPending={q.isPending} error={q.error} />
  if (q.data.items.length === 0) return <p className="font-mono text-sm text-muted">Koi anomaly review ke liye nahi bachi.</p>

  return (
    <div className="overflow-x-auto">
      <p className="mb-2 font-mono text-xs text-muted">
        {q.data.total} rows flagged · top {q.data.items.length} dikh rahi hain
      </p>
      <table className="w-full border-2 border-line text-left font-mono text-xs">
        <thead className="bg-volt text-black">
          <tr>
            <th className="p-2">Indicator / Industry</th>
            <th className="p-2">Period</th>
            <th className="p-2 text-right">Value</th>
            <th className="p-2 text-right">z-score</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {q.data.items.map((a) => (
            <tr key={a.id} className="border-t-2 border-line">
              <td className="p-2">
                {a.indicator}
                {a.industry ? ` · ${a.industry}` : ''}
              </td>
              <td className="p-2 whitespace-nowrap">
                {a.year}
                {a.quarter ? ` ${a.quarter}` : ''}
              </td>
              <td className="p-2 text-right whitespace-nowrap">{formatCrore(a.current_price)}</td>
              <td className="p-2 text-right">{a.anomaly_score?.toFixed(2) ?? '—'}</td>
              <td className="flex gap-1 p-2">
                <button
                  type="button"
                  disabled={review.isPending}
                  onClick={() => review.mutate({ id: a.id, action: 'approve' })}
                  className="border-2 border-line px-2 py-0.5 hover:bg-credit hover:text-black disabled:opacity-50"
                >
                  OK
                </button>
                <button
                  type="button"
                  disabled={review.isPending}
                  onClick={() => review.mutate({ id: a.id, action: 'reject' })}
                  className="border-2 border-line px-2 py-0.5 hover:bg-debit hover:text-black disabled:opacity-50"
                >
                  REJECT
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {review.isError && <p className="mt-2 font-mono text-xs text-debit">{review.error.message}</p>}
    </div>
  )
}
