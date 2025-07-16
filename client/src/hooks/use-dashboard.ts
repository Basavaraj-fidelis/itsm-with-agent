import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["/api/dashboard/summary"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/dashboard/summary", {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Dashboard summary fetch error:", error);
        // Return fallback data instead of throwing
        return {
          total_devices: 0,
          online_devices: 0,
          offline_devices: 0,
          critical_alerts: 0,
          warning_alerts: 0,
          total_tickets: 0,
          open_tickets: 0,
          closed_tickets: 0,
          avg_resolution_time: "0 hours"
        };
      }
    },
    refetchInterval: 30000,
    retry: false, // Disable retries to prevent multiple rejections
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["/api/alerts"],
    queryFn: async () => {
      const response = await api.getAlerts();
      // Don't return empty array fallback - let errors bubble up
      if (!Array.isArray(response)) {
        throw new Error('Invalid alerts data received');
      }
      return response;
    },
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 1000,
  });
}

export function useSLADashboardData() {
  const { data: slaMetrics } = useQuery({
    queryKey: ['sla-metrics'],
    queryFn: async () => {
      const response = await api.getSlaMetrics();
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid SLA metrics data received');
      }
      return response;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
    retryDelay: 1000,
  });

  const { data: slaBreachDetails } = useQuery({
    queryKey: ['sla-breach-details'],
    queryFn: async () => {
      const response = await api.getSlaBreachDetails();
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid SLA breach details data received');
      }
      return response;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
    retryDelay: 1000,
  });

  return {
    slaStatus: {
      totalTicketsWithSLA: slaMetrics?.totalTicketsWithSLA || 0,
      responseBreaches: slaBreachDetails?.responseBreaches || slaMetrics?.responseBreaches || 0,
      resolutionBreaches: slaBreachDetails?.resolutionBreaches || slaMetrics?.resolutionBreaches || 0,
      onTrack: slaMetrics?.onTrackTickets || 0,
      breached: slaBreachDetails?.totalBreached || (slaMetrics?.responseBreaches || 0) + (slaMetrics?.resolutionBreaches || 0),
      compliance: slaMetrics?.slaCompliance || 100,
      details: slaBreachDetails?.details || [],
    },
  };
}