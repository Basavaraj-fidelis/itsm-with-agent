export interface RawAgentData {
  system_info?: {
    hostname?: string;
    os?: string;
    os_version?: string;
    architecture?: string;
    current_user?: string;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
  };
  hardware?: {
    cpu?: {
      model?: string;
      physical_cores?: number;
      logical_cores?: number;
      current_freq?: number;
      max_freq?: number;
    };
    memory?: {
      total?: number;
      available?: number;
      used?: number;
      swap_total?: number;
      swap_used?: number;
    };
    system?: {
      manufacturer?: string;
      model?: string;
      serial_number?: string;
    };
    usb_devices?: USBDevice[];
  };
  network?: {
    interfaces?: NetworkInterface[];
    public_ip?: string;
    primary_mac?: string;
  };
  processes?: ProcessInfo[];
  software?: SoftwareInfo[];
  storage?: {
    disks?: StorageDevice[];
  };
  os_info?: {
    name?: string;
    version?: string;
    architecture?: string;
    processor?: string;
    patches?: PatchInfo[];
  };
  security?: {
    firewall_status?: string;
    antivirus_status?: string;
    last_scan?: string;
    automatic_updates?: string;
    last_update_check?: string;
  };
}

export interface NetworkInterface {
  name: string;
  addresses?: NetworkAddress[];
  stats?: {
    is_up: boolean;
    speed?: number;
    mtu?: number;
    duplex?: string;
  };
  mac?: string;
}

export interface NetworkAddress {
  family: string;
  address: string;
  netmask?: string;
}

export interface USBDevice {
  id?: string;
  description?: string;
  name?: string;
  vendor_id?: string;
  product_id?: string;
  manufacturer?: string;
  serial_number?: string;
  device_class?: string;
  location?: string;
  speed?: string;
  is_connected: boolean;
  first_seen: string;
  last_seen: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_percent: number;
  username?: string;
}

export interface SoftwareInfo {
  name: string;
  version?: string;
  vendor?: string;
  display_name?: string;
  display_version?: string;
}

export interface StorageDevice {
  device?: string;
  mountpoint?: string;
  filesystem?: string;
  total: number;
  used: number;
  free: number;
  percent?: number;
  usage?: {
    percentage: number;
  };
}

export interface PatchInfo {
  id: string;
  installed_on?: {
    DateTime?: string;
    value?: string;
  };
}

export interface Agent {
  id: string;
  hostname: string;
  status: 'online' | 'offline';
  os_name?: string;
  os_version?: string;
  ip_address?: string;
  assigned_user?: string;
  last_seen?: string;
  latest_report?: {
    id: string;
    cpu_usage?: string;
    memory_usage?: string;
    disk_usage?: string;
    network_io?: string;
    collected_at: string;
    raw_data?: string | RawAgentData;
  };
  network?: {
    interfaces?: NetworkInterface[];
    public_ip?: string;
  };
}

export interface SystemInfo {
  platform: string;
  version: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  load_average: string;
  active_processes: number;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    activeProcesses: number;
    loadAverage: string;
  };
  networkStatus?: {
    overall_status: 'healthy' | 'degraded';
    reachable_endpoints: number;
    total_endpoints: number;
    uptime_percentage_24h: number;
    endpoint_status: Record<string, boolean>;
  };
  performanceBaseline?: {
    enabled: boolean;
    total_samples: number;
    active_alerts: number;
    history_days: number;
    collection_interval_seconds: number;
    degradation_threshold_percent: number;
    last_collection: string | null;
  };
  configurationStatus?: {
    valid: boolean;
    api_connected: boolean;
    ssl_enabled: boolean;
    command_filtering_active: boolean;
    allowed_patterns_count: number;
    blocked_patterns_count: number;
    security_level: 'low' | 'medium' | 'high';
  };
}