import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAgents() {
  return useQuery({
    queryKey: ["/api/devices"],
    queryFn: () => api.getDevices(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ["/api/devices", id],
    queryFn: () => api.getDevice(id),
    enabled: !!id,
    refetchInterval: 30000,
  });
}

export function useAgentReports(id: string) {
  return useQuery({
    queryKey: ["/api/devices", id, "reports"],
    queryFn: () => api.getDeviceReports(id),
    enabled: !!id,
    refetchInterval: 30000,
  });
}
