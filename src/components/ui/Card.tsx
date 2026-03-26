import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
}

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-6 shadow-sm", className)}>
      {title && <h2 className="mb-4 text-2xl font-semibold text-tea-700">{title}</h2>}
      {children}
    </div>
  )
}
