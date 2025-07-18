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

    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    console.log(`API Request: ${url}`, config);

    try {
      const response = await fetch(url, config);

      console.log(`API Response: ${response.status} ${response.statusText}`);

      // Handle authentication errors
      if (response.status === 401) {
        console.warn('Authentication failed, clearing token and redirecting to login');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Authentication required');
      }

      // Don't throw for other client errors, let the caller handle them
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

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getAuthToken = () => {
  return localStorage.getItem('auth_token');
}

const clearAuthToken = () => {
  localStorage.removeItem('auth_token');
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://0.0.0.0:5000';

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);

  // Prevent the default behavior (logging to console)
  event.preventDefault();

  // You can add custom error reporting here
  if (event.reason?.message) {
    console.error('Error details:', event.reason.message);
  }
});

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
    try {
      const response = await apiClient.get("/api/analytics/performance/overview");
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Performance overview API error:', response.status, errorText);

        // Return fallback data instead of throwing
        return {
          totalDevices: 0,
          onlineDevices: 0,
          avgCpuUsage: 0,
          avgMemoryUsage: 0,
          avgDiskUsage: 0,
          criticalDevices: 0,
          performanceAlerts: 0
        };
      }
      return await response.json();
    } catch (error) {
      console.error('Performance overview fetch error:', error);
      // Return fallback data on network error
      return {
        totalDevices: 0,
        onlineDevices: 0,
        avgCpuUsage: 0,
        avgMemoryUsage: 0,
        avgDiskUsage: 0,
        criticalDevices: 0,
        performanceAlerts: 0
      };
    }
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
  login: (credentials: { email: string; password: string }) => 
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }).catch(error => {
      console.error('Login API error:', error);
      throw error;
    }),
  register: (userData: any) => apiClient.post("/api/auth/register", userData),
  logout: () => apiClient.post("/api/auth/logout", {}),
  getProfile: () => apiClient.get("/api/auth/profile"),

  // Dashboard
  getDashboard: () => apiClient.get("/api/dashboard"),

  // Devices/Agents
  getDevices2: () => apiClient.get("/api/devices"),
  getAgents: () => apiClient.get("/api/agents"),
  getAgent: (id: string) => apiClient.get(`/api/agents/${id}`),

  // Users - Enhanced with full CRUD operations
  getUsers: async (filters?: { role?: string; department?: string; status?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });
    }
    const response = await apiClient.get(`/api/users?${params.toString()}`);
    return response.json();
  },

  getUserStats: async () => {
    const response = await apiClient.get("/api/users/stats");
    return response.json();
  },

  createUser: async (userData: any) => {
    const response = await apiClient.post("/api/users", userData);
    return response.json();
  },

  updateUser: async (id: string, userData: any) => {
    const response = await apiClient.put(`/api/users/${id}`, userData);
    return response.json();
  },

  deleteUser: async (id: string) => {
    const response = await apiClient.delete(`/api/users/${id}`);
    return response.json();
  },

  lockUser: async (id: string, locked: boolean) => {
    const response = await apiClient.post(`/api/users/${id}/lock`, { locked });
    return response.json();
  },

  resetUserPassword: async (id: string, password: string) => {
    const response = await apiClient.post(`/api/users/${id}/reset-password`, { password });
    return response.json();
  },

  // Enhanced Analytics
  getSystemAnalytics: async () => {
    const response = await apiClient.get("/api/analytics/system");
    return response.json();
  },

  getTicketAnalytics: async (timeRange: string = "30d") => {
    const response = await apiClient.get(`/api/analytics/tickets?timeRange=${timeRange}`);
    return response.json();
  },

  getUserAnalytics: async (timeRange: string = "30d") => {
    const response = await apiClient.get(`/api/analytics/users?timeRange=${timeRange}`);
    return response.json();
  },

  // Enhanced Security
  getSecurityAlerts: async () => {
    const response = await apiClient.get("/api/security/alerts");
    return response.json();
  },

  getAuditLogs: async (filters?: { user?: string; action?: string; resource?: string }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const response = await apiClient.get(`/api/audit/logs?${params.toString()}`);
    return response.json();
  },

  // Enhanced Knowledge Base
  getKnowledgeBaseStats: async () => {
    const response = await apiClient.get("/api/knowledge/stats");
    return response.json();
  },

  searchKnowledgeBase: async (query: string, filters?: { category?: string; tags?: string[] }) => {
    const params = new URLSearchParams({ q: query });
    if (filters?.category) params.append('category', filters.category);
    if (filters?.tags) params.append('tags', filters.tags.join(','));
    const response = await apiClient.get(`/api/knowledge/search?${params.toString()}`);
    return response.json();
  },

  // Enhanced Automation
  getAutomationWorkflows: async () => {
    const response = await apiClient.get("/api/automation/workflows");
    return response.json();
  },

  createAutomationWorkflow: async (workflow: any) => {
    const response = await apiClient.post("/api/automation/workflows", workflow);
    return response.json();
  },

  executeAutomationWorkflow: async (id: string, parameters?: any) => {
    const response = await apiClient.post(`/api/automation/workflows/${id}/execute`, parameters);
    return response.json();
  },

  // Enhanced Reporting
  generateReport: async (type: string, parameters: any) => {
    const response = await apiClient.post(`/api/reports/generate/${type}`, parameters);
    if (!response.ok) {
      throw new Error(`Failed to generate report: ${response.status}`);
    }
    return response.json();
  },

  getReportHistory: async () => {
    const response = await apiClient.get("/api/reports/history");
    if (!response.ok) {
      throw new Error(`Failed to fetch report history: ${response.status}`);
    }
    return response.json();
  },

  downloadReport: async (reportId: string) => {
    const response = await apiClient.get(`/api/reports/download/${reportId}`);
    if (!response.ok) {
      throw new Error(`Failed to download report: ${response.status}`);
    }
    return response.blob();
  },

  // Enhanced Backend Integration
  getSystemHealth: async () => {
    const response = await apiClient.get("/api/system/health");
    if (!response.ok) {
      throw new Error(`Failed to fetch system health: ${response.status}`);
    }
    return response.json();
  },

  getAIInsights: async (deviceId?: string) => {
    const endpoint = deviceId ? `/api/ai/insights/${deviceId}` : "/api/ai/insights";
    const response = await apiClient.get(endpoint);
    if (!response.ok) {
      throw new Error(`Failed to fetch AI insights: ${response.status}`);
    }
    return response.json();
  },

  getAutomationStats: async () => {
    const response = await apiClient.get("/api/automation/stats");
    if (!response.ok) {
      throw new Error(`Failed to fetch automation stats: ${response.status}`);
    }
    return response.json();
  },

  getComplianceReport: async () => {
    const response = await apiClient.get("/api/compliance/report");
    if (!response.ok) {
      throw new Error(`Failed to fetch compliance report: ${response.status}`);
    }
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

const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
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
      if (response.status === 401) {
        // Token expired or invalid - handle gracefully
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        throw new Error('Authentication required');
      }

      if (response.status === 403) {
        throw new Error('Access forbidden');
      }

      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};