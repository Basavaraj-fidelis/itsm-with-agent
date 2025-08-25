
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Agent {
  id: string;
  hostname: string;
  ip_address: string;
  status: 'online' | 'offline' | 'warning';
  last_seen: string;
  version: string;
  os_type: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  uptime?: number;
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async (): Promise<Agent[]> => {
      try {
        const agents = await api.get<Agent[]>('/agents');
        return Array.isArray(agents) ? agents : [];
      } catch (error) {
        console.error('Error fetching agents:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ['agents', id],
    queryFn: async (): Promise<Agent | null> => {
      try {
        return await api.get<Agent>(`/agents/${id}`);
      } catch (error) {
        console.error(`Error fetching agent ${id}:`, error);
        return null;
      }
    },
    enabled: !!id,
  });
}

export function useAgentReports(id: string) {
  return useQuery({
    queryKey: ['agents', id, 'reports'],
    queryFn: async () => {
      try {
        return await api.get(`/agents/${id}/reports`);
      } catch (error) {
        console.error(`Error fetching agent reports for ${id}:`, error);
        return [];
      }
    },
    enabled: !!id,
  });
}
