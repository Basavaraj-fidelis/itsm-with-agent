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
    try {
      const response = await apiRequest("GET", "/api/dashboard/summary");
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard summary: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Dashboard summary fetch failed:', error);
      return {
        total_devices: 0,
        online_devices: 0,
        offline_devices: 0,
        active_alerts: 0
      };
    }
  },

  async getDevices(): Promise<Device[]> {
    try {
      const response = await apiRequest("GET", "/api/devices");
      if (!response.ok) {
        throw new Error(`Failed to fetch devices: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Devices fetch failed:', error);
      return [];
    }
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
    try {
      const response = await apiRequest("GET", "/api/alerts");
      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Alerts fetch failed:', error);
      return [];
    }
  },
  // Auth
  login: (credentials: { email: string; password: string }) => post("/api/auth/login", credentials),
  register: (userData: any) => post("/api/auth/register", userData),
  logout: () => post("/api/auth/logout", {}),
  getProfile: () => get("/api/auth/profile"),

  // Dashboard
  getDashboard: () => get("/api/dashboard"),

  // Devices/Agents
  getDevices2: () => get("/api/devices"),
  getAgents: () => get("/api/agents"),
  getAgent: (id: string) => get(`/api/agents/${id}`),

  // Users
  getUsers: async () => {
    const response = await apiRequest("GET", "/api/users");
    return response.json();
  },

  // Alerts
  getAlerts2: () => get("/api/alerts"),
};

async function post(url: string, data?: any) {
  return apiRequest(url, { method: "POST", body: JSON.stringify(data) });
}

async function get(url: string) {
  return apiRequest(url, { method: "GET" });
}

class ApiClient {
  private baseURL: string;

  constructor() {
    // Use relative URLs in production, full URLs in development
    this.baseURL = import.meta.env.DEV ? 'http://localhost:5000' : '';
  }

  private async request(url: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('auth_token');

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${this.baseURL}${url}`, config);

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your connection.');
      }
      throw error;
    }
  }
}