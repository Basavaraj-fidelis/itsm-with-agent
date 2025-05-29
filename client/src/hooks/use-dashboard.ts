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
  const { isLoading, error, data } = useQuery({
    queryKey: ["/api/dashboard/summary"],
    queryFn: mockGetDashboardSummary,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Calculate total CPU usage
  const totalCpuUsage = data?.reduce((sum, agent) => {
    const cpuUsage = agent.latest_data?.cpu_usage || 0;
    return sum + cpuUsage;
  }, 0) / Math.max(data?.length || 0, 1) || 0;

  // Calculate total memory usage
  const totalMemoryUsage = data?.reduce((sum, agent) => {
    const memoryUsage = agent.latest_data?.memory_usage || 0;
    return sum + memoryUsage;
  }, 0) / Math.max(data?.length || 0, 1) || 0;

  // Calculate total disk usage and space across all agents
  const diskStats = data?.reduce((acc, agent) => {
    const storageData = agent.latest_data?.storage;
    let agentDiskUsage = agent.latest_data?.disk_usage || 0;
    let agentTotalSpace = 0;
    let agentUsedSpace = 0;

    // If we have detailed storage data, calculate combined usage
    if (storageData && Array.isArray(storageData.disks) && storageData.disks.length > 0) {
      storageData.disks.forEach(disk => {
        if (disk.usage && disk.usage.total && disk.usage.used) {
          agentTotalSpace += disk.usage.total;
          agentUsedSpace += disk.usage.used;
        }
      });

      if (agentTotalSpace > 0) {
        agentDiskUsage = (agentUsedSpace / agentTotalSpace) * 100;
      }
    }

    return {
      totalUsagePercent: acc.totalUsagePercent + agentDiskUsage,
      totalSpace: acc.totalSpace + agentTotalSpace,
      usedSpace: acc.usedSpace + agentUsedSpace,
      agentCount: acc.agentCount + 1
    };
  }, { totalUsagePercent: 0, totalSpace: 0, usedSpace: 0, agentCount: 0 }) || {totalUsagePercent: 0, totalSpace: 0, usedSpace: 0, agentCount: 0};

  const totalDiskUsage = Math.round(diskStats.totalUsagePercent / Math.max(diskStats.agentCount, 1));

  // Format disk space for display
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const diskSpaceInfo = diskStats.totalSpace > 0
    ? `${formatBytes(diskStats.usedSpace)} / ${formatBytes(diskStats.totalSpace)}`
    : null;

  return {
    isLoading,
    error,
    data: {
      totalAgents: data?.length || 0,
      activeAgents: data?.filter(agent => agent.status === 'online').length || 0,
      averageCpuUsage: totalCpuUsage,
      averageMemoryUsage: totalMemoryUsage,
      averageDiskUsage: totalDiskUsage,
      diskSpaceInfo,
      recentAlerts: 0, // TODO: Implement alerts
      systemHealth: totalCpuUsage < 80 && totalMemoryUsage < 80 && totalDiskUsage < 80 ? 'good' : 'warning',
      agents: data || []
    }
  };
}

export function useAlerts() {
  return useQuery({
    queryKey: ["/api/alerts"],
    queryFn: () => api.getAlerts(),
    refetchInterval: 30000,
  });
}