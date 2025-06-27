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