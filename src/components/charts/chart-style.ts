import type { CSSProperties } from 'react'

// Charts ka common look (brutalist: seedhe kone, moti border)
export const axisTick = { fontSize: 11, fill: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace' }

export const tooltipStyle: CSSProperties = {
  background: 'var(--paper)',
  border: '2px solid var(--line)',
  borderRadius: 0,
  color: 'var(--ink)',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 12,
}
