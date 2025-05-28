import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["/api/dashboard/summary"],
    queryFn: () => api.getDashboardSummary(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["/api/alerts"],
    queryFn: () => api.getAlerts(),
    refetchInterval: 30000,
  });
}
