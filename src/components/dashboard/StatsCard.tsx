'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  icon: LucideIcon
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

const variantStyles = {
  default: {
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20',
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  success: {
    bg: 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
    icon: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  error: {
    bg: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  info: {
    bg: 'bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20',
    icon: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
}

export function StatsCard({
  icon: Icon,
  title,
  value,
  change,
  changeLabel,
  variant = 'default',
}: StatsCardProps) {
  const styles = variantStyles[variant]
  const isPositiveChange = change && change > 0

  return (
    <div
      className={cn(
        'rounded-lg border p-6 transition-all hover:shadow-md',
        styles.bg,
        styles.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1 pt-1">
              <span
                className={cn(
                  'text-xs font-semibold',
                  isPositiveChange
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {isPositiveChange ? '+' : ''}{change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={cn('rounded-lg bg-white/50 p-3 dark:bg-gray-800/50', styles.icon)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
