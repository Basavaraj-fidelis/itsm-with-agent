import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface Alert {
  id: string
  device_id: string
  type: string
  severity: "critical" | "high" | "warning" | "info" | "ok"
  title: string
  message: string
  timestamp: string
  acknowledged: boolean
  resolved: boolean
  metadata?: any
}

export const ALERT_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  WARNING: 'warning',
  INFO: 'info',
  OK: 'ok',
} as const

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async (): Promise<Alert[]> => {
      try {
        const alerts = await api.get<Alert[]>('/alerts')
        return Array.isArray(alerts) ? alerts : []
      } catch (error) {
        console.error('Error fetching alerts:', error)
        return []
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export function useAlert(id: string) {
  return useQuery({
    queryKey: ['alerts', id],
    queryFn: async (): Promise<Alert | null> => {
      try {
        return await api.get<Alert>(`/alerts/${id}`)
      } catch (error) {
        console.error(`Error fetching alert ${id}:`, error)
        return null
      }
    },
    enabled: !!id,
  })
}