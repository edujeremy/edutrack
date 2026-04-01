import { format, formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Role } from './types'

/**
 * Merge classnames using template literals
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Format date to Korean locale
 */
export function formatDate(date: string | Date, formatStr: string = 'PPP'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date'
    }
    return format(dateObj, formatStr, { locale: ko })
  } catch (error) {
    return 'Invalid date'
  }
}

/**
 * Format date as relative time (e.g., "2시간 전")
 */
export function formatDistanceFromNow(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(dateObj, { locale: ko, addSuffix: true })
}

/**
 * Format currency to Korean Won
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Get color class for status
 */
export function getStatusColor(
  status: string
): 'success' | 'warning' | 'error' | 'info' {
  const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
    // Payment statuses
    completed: 'success',
    pending: 'warning',
    failed: 'error',
    refunded: 'info',
    // Student statuses
    active: 'success',
    inactive: 'warning',
    graduated: 'info',
    // Application statuses
    accepted: 'success',
    submitted: 'info',
    rejected: 'error',
    waitlisted: 'warning',
    draft: 'warning',
  }
  return statusColorMap[status] || 'info'
}

/**
 * Get label for role
 */
export function getRoleLabel(role: Role): string {
  const roleLabels: Record<Role, string> = {
    admin: '관리자',
    manager: '원장',
    teacher: '강사',
    student: '학생',
    parent: '학부모',
  }
  return roleLabels[role] || role
}

/**
 * Get day of week name in Korean
 */
export function getDayOfWeekName(dayOfWeek: number): string {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${days[dayOfWeek] || ''}요일`
}

/**
 * Format time string (HH:mm)
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '-'
  const [hours, minutes] = time.split(':')
  return `${hours}:${minutes}`
}

/**
 * Check if date is today
 */
export function isToday(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  )
}

/**
 * Check if date is in the past
 */
export function isPast(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj < new Date()
}

/**
 * Check if date is in the future
 */
export function isFuture(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj > new Date()
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number format (Korean)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(\+82|0)([0-9]{9,10})$/
  // Remove both spaces and hyphens before validation
  return phoneRegex.test(phone.replace(/[\s-]/g, ''))
}
