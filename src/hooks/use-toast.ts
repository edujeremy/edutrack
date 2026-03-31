'use client'

import { useCallback } from 'react'
import toast from 'react-hot-toast'

export function useToast() {
  const showToast = useCallback(
    ({
      title,
      description,
      variant = 'default',
    }: {
      title?: string
      description?: string
      variant?: 'default' | 'destructive'
    }) => {
      const message = [title, description].filter(Boolean).join(': ')
      if (variant === 'destructive') {
        toast.error(message || '오류가 발생했습니다')
      } else {
        toast.success(message || '완료되었습니다')
      }
    },
    []
  )

  return { toast: showToast }
}
