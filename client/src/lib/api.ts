import { apiRequest } from "./queryClient";
import { QueryClient } from '@tanstack/react-query';

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

const BASE_URL = import.meta.env.VITE_API_URL || 'http://0.0.0.0:5000';

class ApiClient {
  private baseURL: string;

  constructor() {
    // Use relative path for API calls to avoid mixed content issues
    this.baseURL = "";
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

// Create and export a singleton instance
const apiClient = new ApiClient();

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

const getAuthToken = () => {
  return localStorage.getItem('auth_token');
}

const clearAuthToken = () => {
  localStorage.removeItem('auth_token');
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://0.0.0.0:5000';

const makeRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getAuthToken();

  console.log(`API Request: ${url}`, options.body && typeof options.body === 'string' ? 
    (() => { try { return JSON.parse(options.body as string); } catch { return options.body; } })() : '');

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);
    console.log(`API Response: ${response.status} ${response.statusText}`);

    if (response.status === 401) {
      clearAuthToken();
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    // Don't throw on non-2xx status codes, let the caller handle them
    return response;
  } catch (error) {
    console.error(`API Error for ${url}:`, error);
    throw error;
  }
};

export const api = {
  // Core HTTP methods
  get: (url: string) => apiClient.get(url),
  post: (url: string, data?: any) => apiClient.post(url, data),
  put: (url: string, data?: any) => apiClient.put(url, data),
  delete: (url: string) => apiClient.delete(url),

  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get("/api/dashboard/summary");
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard summary: ${response.status}`);
    }
    return await response.json();
  },

  async getDevices(): Promise<Device[]> {
    const response = await apiClient.get("/api/devices");
    if (!response.ok) {
      throw new Error(`Failed to fetch devices: ${response.status}`);
    }
    return await response.json();
  },

  getPerformanceInsights: async (deviceId: string) => {
    const response = await apiClient.get(`/api/analytics/performance/insights/${deviceId}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Performance insights API error:', response.status, errorText);
      throw new Error(`Failed to fetch performance insights: ${response.status} ${errorText}`);
    }
    return await response.json();
  },

  getPerformancePredictions: async (deviceId: string) => {
    const response = await apiClient.get(`/api/analytics/performance/predictions/${deviceId}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Performance predictions API error:', response.status, errorText);
      throw new Error(`Failed to fetch performance predictions: ${response.status} ${errorText}`);
    }
    return await response.json();
  },

  getPerformanceOverview: async () => {
    const response = await apiClient.get("/api/analytics/performance/overview");
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Performance overview API error:', response.status, errorText);
      throw new Error(`Failed to fetch performance overview: ${response.status} ${errorText}`);
    }
    return await response.json();
  },

  getPerformanceTrends: async (timeRange: string = "24h") => {
    const response = await apiClient.get(`/api/analytics/performance/trends?timeRange=${timeRange}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Performance trends API error:', response.status, errorText);
      throw new Error(`Failed to fetch performance trends: ${response.status} ${errorText}`);
    }
    return await response.json();
  },

  async getVulnerabilities(deviceId: string): Promise<any[]> {
    const response = await apiClient.get(`/api/security/vulnerabilities/${deviceId}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch vulnerabilities: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    console.log('Vulnerabilities data:', data);
    return data;
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
    const response = await apiClient.get("/api/alerts");
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alerts API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
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

  // SLA Analysis
  getSLAAnalysis: (timeRange: string = "30d") =>
    apiRequest(`/api/sla-analysis/dashboard?timeRange=${timeRange}`),

  getSLABreachDetails: () =>
    apiRequest("/api/sla/breach-details"),
};

async function post(url: string, data?: any) {
  return apiRequest(url, { method: "POST", body: JSON.stringify(data) });
}

async function get(url: string) {
  return apiRequest(url, { method: "GET" });
}

// API utility functions

const API_BASE = '/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    console.log('API Request:', `${API_BASE}${endpoint}`);

    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    console.log('API Response:', response.status, response.statusText);

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }
      throw new ApiError(errorMessage, response.status, response.statusText);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text() as unknown as T;
    }
  } catch (error) {
    console.error('API Request Failed:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}