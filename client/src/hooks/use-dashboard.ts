import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["/api/dashboard/summary"],
    queryFn: async () => {
      const response = await api.getDashboardSummary();
      // Don't return mock data - let errors bubble up
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid dashboard data received');
      }
      return response;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
    retryDelay: 1000,
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