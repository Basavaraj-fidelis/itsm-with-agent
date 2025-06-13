
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
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/alerts', { headers });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required');
          }
          throw new Error(`Failed to fetch alerts: ${response.status}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Alert fetch error:', error);
        // Return empty array to prevent UI crashes
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
    onError: (error) => {
      console.error('useAlerts error:', error);
    }
  })
}
