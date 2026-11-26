import type { ReactNode } from 'react'

// Brutalist card: moti border + hard shadow (blur nahi)
export default function Card({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`border-2 border-line bg-paper p-5 shadow-[4px_4px_0_0_var(--line)] ${className}`}>
      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">{title}</h2>
      {children}
    </section>
  )
}
