
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

export async function resolveAlert(alertId: string): Promise<boolean> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error resolving alert:', error);
    return false;
  }
}

export async function markAlertAsRead(alertId: string): Promise<boolean> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/alerts/${alertId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error marking alert as read:', error);
    return false;
  }
}

export async function createTicketFromAlert(alert: Alert, description: string, priority: string): Promise<any> {
  try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const ticketData = {
      type: "incident",
      title: `CRITICAL ALERT: ${alert.message}`,
      description: description,
      priority: priority,
      requester_email: user.email || 'admin@company.com',
      category: `System Alert - ${alert.category}`,
      impact: alert.severity === "critical" ? "high" : "medium",
      urgency: alert.severity === "critical" ? "high" : "medium"
    };

    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(ticketData)
    });

    if (!response.ok) {
      throw new Error('Failed to create ticket');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating ticket from alert:', error);
    throw error;
  }
}
