import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateQrToken(): string {
  return crypto.randomUUID()
}

export function getQrCheckinUrl(eventId: string, token: string): string {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : ''
  return `${baseUrl}/checkin/${eventId}?token=${token}`
}

