
import { useQuery } from '@tanstack/react-query'

interface Alert {
  id: string
  device_id: string
  device_hostname: string
  category: string
  severity: "critical" | "high" | "warning" | "info"
  message: string
  metadata: any
  triggered_at: string
  resolved_at?: string
  is_active: boolean
}

export function useAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await fetch('/api/alerts')
      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }
      return response.json()
    }
  })
}
