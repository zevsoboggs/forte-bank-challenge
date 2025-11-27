import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'KZT'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function getRiskLevelColor(level: string): string {
  const colors: Record<string, string> = {
    CRITICAL: 'text-red-600 bg-red-50',
    HIGH: 'text-orange-600 bg-orange-50',
    MEDIUM: 'text-yellow-600 bg-yellow-50',
    LOW: 'text-green-600 bg-green-50',
  }
  return colors[level] || colors.LOW
}

export function getRiskLevelBadge(level: string): string {
  const badges: Record<string, string> = {
    CRITICAL: 'risk-badge-critical',
    HIGH: 'risk-badge-high',
    MEDIUM: 'risk-badge-medium',
    LOW: 'risk-badge-low',
  }
  return badges[level] || badges.LOW
}
