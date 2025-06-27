import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAgents() {
  return useQuery({
    queryKey: ["/api/devices"],
    queryFn: () => api.getDevices(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export const useAgent = (id: string) => {
  return useQuery({
    queryKey: ["agent", id],
    queryFn: async () => {
      if (!id) throw new Error("Agent ID is required");
      return api.getDevice(id);
    },
    enabled: !!id,
    retry: 1,
  });
};

export function useAgentReports(id: string) {
  return useQuery({
    queryKey: ["/api/devices", id, "reports"],
    queryFn: () => api.getDeviceReports(id),
    enabled: !!id,
    refetchInterval: 30000,
  });
}