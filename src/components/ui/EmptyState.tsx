import React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-12 px-4 text-center',
        className
      )}
    >
      {icon && <div className="text-gray-400">{icon}</div>}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-gray-600 max-w-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
