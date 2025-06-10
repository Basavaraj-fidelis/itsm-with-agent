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
  // Core HTTP methods
  get: (url: string) => apiClient.get(url),
  post: (url: string, data?: any) => apiClient.post(url, data),
  put: (url: string, data?: any) => apiClient.put(url, data),
  delete: (url: string) => apiClient.delete(url),

  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const response = await apiClient.get("/api/dashboard/summary");
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
      const response = await apiClient.get("/api/devices");
      if (!response.ok) {
        throw new Error(`Failed to fetch devices: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Devices fetch failed:', error);
      return [];
    }
  },

  async getPerformanceInsights(deviceId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/performance/insights/${deviceId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch performance insights: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Performance insights fetch failed:', error);
      return null;
    }
  },

  async getPerformancePredictions(deviceId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`/api/performance/predictions/${deviceId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch performance predictions: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Performance predictions fetch failed:', error);
      return [];
    }
  },

  async getVulnerabilities(deviceId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`/api/security/vulnerabilities/${deviceId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch vulnerabilities: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      console.log('Vulnerabilities data:', data);
      return data;
    } catch (error) {
      console.error('Vulnerability API error:', error);
      return [];
    }
  },

  async getDevice(id: string): Promise<Device> {
    const response = await apiClient.get(`/api/devices/${id}`);
    return response.json();
  },

  async getDeviceReports(id: string): Promise<DeviceReport[]> {
    const response = await apiClient.get(`/api/devices/${id}/reports`);
    return response.json();
  },

  async getAlerts(): Promise<Alert[]> {
    try {
      const response = await apiClient.get("/api/alerts");
      if (!response.ok) {
        console.error(`Alerts API returned ${response.status}`);
        return [];
      }
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error('Alerts response is not valid JSON:', text.substring(0, 100));
        return [];
      }
    } catch (error) {
      console.error('Alerts fetch failed:', error);
      return [];
    }
  },

  // Auth
  login: (credentials: { email: string; password: string }) => apiClient.post("/api/auth/login", credentials),
  register: (userData: any) => apiClient.post("/api/auth/register", userData),
  logout: () => apiClient.post("/api/auth/logout", {}),
  getProfile: () => apiClient.get("/api/auth/profile"),

  // Dashboard
  getDashboard: () => apiClient.get("/api/dashboard"),

  // Devices/Agents
  getDevices2: () => apiClient.get("/api/devices"),
  getAgents: () => apiClient.get("/api/agents"),
  getAgent: (id: string) => apiClient.get(`/api/agents/${id}`),

  // Users
  getUsers: async () => {
    const response = await apiClient.get("/api/users");
    return response.json();
  },

  // Alerts
  getAlerts2: () => apiClient.get("/api/alerts"),
};

async function post(url: string, data?: any) {
  return apiRequest(url, { method: "POST", body: JSON.stringify(data) });
}

async function get(url: string) {
  return apiRequest(url, { method: "GET" });
}

const BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = BASE_URL;
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if it exists
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    console.log(`API Request: ${url}`, config);

    try {
      const response = await fetch(url, config);

      console.log(`API Response: ${response.status} ${response.statusText}`);

      // Don't throw for client errors, let the caller handle them
      return response;
    } catch (error) {
      console.error('API Request failed:', error);
      // Handle network connection errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      }
      throw error;
    }
  }

  async get(url: string): Promise<Response> {
    return this.request(url, { method: 'GET' });
  }

  async post(url: string, data?: any): Promise<Response> {
    return this.request(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(url: string, data?: any): Promise<Response> {
    return this.request(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(url: string): Promise<Response> {
    return this.request(url, { method: 'DELETE' });
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Create and export a singleton instance
const apiClient = new ApiClient();