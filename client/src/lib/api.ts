import { apiRequest } from "./queryClient";

export interface DashboardSummary {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  active_alerts: number;
}

export interface DeviceReport {
  cpu_usage: string | null;
  memory_usage: string | null;
  disk_usage: string | null;
  network_io: string | null;
  collected_at: string;
  raw_data?: any;
}

export interface Device {
  id: string;
  hostname: string;
  assigned_user: string | null;
  os_name: string | null;
  os_version: string | null;
  ip_address: string | null;
  status: string;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
  latest_report?: DeviceReport | null;
}

export interface Alert {
  id: string;
  device_id: string;
  category: string;
  severity: string;
  message: string;
  metadata: any;
  triggered_at: string;
  resolved_at: string | null;
  is_active: boolean;
  device_hostname?: string;
}

export const api = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await apiRequest("GET", "/api/dashboard/summary");
    return response.json();
  },

  async getDevices(): Promise<Device[]> {
    const response = await apiRequest("GET", "/api/devices");
    return response.json();
  },

  async getDevice(id: string): Promise<Device> {
    const response = await apiRequest("GET", `/api/devices/${id}`);
    return response.json();
  },

  async getDeviceReports(id: string): Promise<DeviceReport[]> {
    const response = await apiRequest("GET", `/api/devices/${id}/reports`);
    return response.json();
  },

  async getAlerts(): Promise<Alert[]> {
    const response = await apiRequest("GET", "/api/alerts");
    return response.json();
  }
};
