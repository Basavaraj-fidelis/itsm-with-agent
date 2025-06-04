import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Mock implementation of api.getDashboardSummary
const mockGetDashboardSummary = async () => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simulate data from multiple agents
  const mockData = [
    {
      id: "agent1",
      status: "online",
      latest_data: {
        cpu_usage: 50,
        memory_usage: 60,
        disk_usage: 70,
        storage: {
          disks: [
            {
              name: "/dev/sda1",
              usage: { total: 100 * 1024 * 1024 * 1024, used: 70 * 1024 * 1024 * 1024 } // 100GB total, 70GB used
            },
            {
              name: "/dev/sdb1",
              usage: { total: 50 * 1024 * 1024 * 1024, used: 20 * 1024 * 1024 * 1024 } // 50GB total, 20GB used
            }
          ]
        }
      }
    },
    {
      id: "agent2",
      status: "offline",
      latest_data: {
        cpu_usage: 30,
        memory_usage: 40,
        disk_usage: 50,
        storage: {
          disks: [
            {
              name: "/dev/sdc1",
              usage: { total: 200 * 1024 * 1024 * 1024, used: 50 * 1024 * 1024 * 1024 } // 200GB total, 50GB used
            }
          ]
        }
      }
    }
  ];

  return mockData;
};

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