
import { useMemo } from 'react';

export interface ProcessedAgentData {
  systemInfo: {
    hostname: string;
    osName: string;
    osVersion: string;
    architecture: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    assignedUser: string;
  };
  networkInfo: {
    primaryIP: string;
    ethernetIP: string;
    wifiIP: string;
    allIPs: string[];
    macAddresses: string;
    publicIP: string;
    interfaces: any[];
  };
  hardwareInfo: {
    processor: string;
    physicalCores: string;
    logicalCores: string;
    cpuFreq: string;
    maxFreq: string;
    totalMemory: string;
    availableMemory: string;
    usedMemory: string;
  };
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIO: number;
  };
  usbDevices: any[];
  processes: any[];
  software: any[];
  storage: any[];
}

export class AgentDataProcessor {
  static processRawData(rawDataInput: string | object | undefined | null): any {
    try {
      if (!rawDataInput) return {};
      
      return typeof rawDataInput === "string" 
        ? JSON.parse(rawDataInput) 
        : rawDataInput;
    } catch (error) {
      console.error('Error parsing raw data:', error);
      return {};
    }
  }

  static extractSystemInfo(agent: any, rawData: any): ProcessedAgentData['systemInfo'] {
    const systemInfo = rawData.system_info || rawData.hardware || rawData.os_info || {};
    const systemHardware = rawData.hardware?.system || {};

    const assignedUser = (() => {
      const user = rawData.extracted_current_user ||
        rawData.assigned_user ||
        agent.assigned_user ||
        rawData.current_user ||
        rawData.user ||
        rawData.username ||
        rawData.system_info?.current_user ||
        rawData.os_info?.current_user ||
        rawData.hardware?.current_user;

      if (!user || user.endsWith("$") || user === "Unknown" || user === "N/A" || 
          user.includes("SYSTEM") || user.includes("NETWORK SERVICE") || 
          user.includes("LOCAL SERVICE")) {
        return "N/A";
      }

      if (user.includes("\\")) return user.split("\\").pop() || user;
      if (user.includes("@")) return user.split("@")[0];
      return user;
    })();

    return {
      hostname: agent.hostname || rawData.hostname || rawData.computer_name || "Unknown",
      osName: agent.os_name || rawData.os || rawData.operating_system || systemInfo.os || "Unknown",
      osVersion: agent.os_version || rawData.os_version || systemInfo.os_version || rawData.version || "Unknown",
      architecture: rawData.os_info?.architecture || rawData.architecture || systemInfo.architecture || 
        rawData.arch || systemInfo.arch || rawData.system_info?.architecture || 
        rawData.hardware?.system?.architecture || rawData.platform_info?.architecture || "64bit",
      manufacturer: systemHardware.manufacturer || rawData.manufacturer || 
        rawData.system_info?.manufacturer || rawData.hardware?.manufacturer || "Unknown",
      model: systemHardware.model || rawData.model || rawData.system_info?.model || 
        rawData.hardware?.model || "Unknown",
      serialNumber: rawData.hardware?.system?.serial_number || systemHardware.serial_number || 
        rawData.serial_number || rawData.system_info?.serial_number || "To be filled by O.E.M.",
      assignedUser
    };
  }

  static extractNetworkInfo(agent: any, rawData: any): ProcessedAgentData['networkInfo'] {
    const interfaces = rawData.network?.interfaces || agent.network?.interfaces || [];
    
    const getEthernetIP = (): string => {
      for (const iface of interfaces) {
        const name = iface.name?.toLowerCase() || "";
        if ((name.includes("eth") || name.includes("ethernet") || name.includes("enet") || 
             name.includes("local area connection")) && !name.includes("veth") && 
             !name.includes("virtual") && iface.stats?.is_up !== false) {
          for (const addr of iface.addresses || []) {
            if (addr.family === "AF_INET" && !addr.address.startsWith("127.") && 
                !addr.address.startsWith("169.254.") && addr.address !== "0.0.0.0") {
              return addr.address;
            }
          }
        }
      }
      return "Not Available";
    };

    const getWiFiIP = (): string => {
      for (const iface of interfaces) {
        const name = iface.name?.toLowerCase() || "";
        if ((name.includes("wifi") || name.includes("wlan") || name.includes("wireless") || 
             name.includes("wi-fi") || name.includes("802.11")) && iface.stats?.is_up !== false) {
          for (const addr of iface.addresses || []) {
            if (addr.family === "AF_INET" && !addr.address.startsWith("127.") && 
                !addr.address.startsWith("169.254.") && addr.address !== "0.0.0.0") {
              return addr.address;
            }
          }
        }
      }
      return "Not Available";
    };

    const getAllIPs = (): string[] => {
      const allIPs: string[] = [];
      for (const iface of interfaces) {
        const name = iface.name?.toLowerCase() || "";
        const isVirtual = name.includes("virtual") || name.includes("veth") || 
          name.includes("docker") || name.includes("vmware");

        if (!isVirtual && iface.stats?.is_up !== false) {
          for (const addr of iface.addresses || []) {
            if (addr.family === "AF_INET" && addr.address && 
                !addr.address.startsWith("127.") && !addr.address.startsWith("169.254.") && 
                addr.address !== "0.0.0.0" && !allIPs.includes(addr.address)) {
              allIPs.push(addr.address);
            }
          }
        }
      }
      return allIPs;
    };

    const getMacAddresses = (): string => {
      if (rawData.primary_mac) return rawData.primary_mac;
      if (rawData.network?.primary_mac) return rawData.network.primary_mac;
      if (rawData.hardware?.primary_mac) return rawData.hardware.primary_mac;
      if (rawData.system_info?.primary_mac) return rawData.system_info.primary_mac;

      const macAddresses = [];
      for (const iface of interfaces) {
        if (iface.addresses && Array.isArray(iface.addresses)) {
          for (const addr of iface.addresses) {
            if ((addr.family?.includes("AF_LINK") || addr.family?.includes("AF_PACKET")) && 
                addr.address && addr.address !== "00:00:00:00:00:00") {
              macAddresses.push(`${iface.name}: ${addr.address}`);
            }
          }
        }
        if (iface.mac && iface.mac !== "00:00:00:00:00:00") {
          macAddresses.push(`${iface.name}: ${iface.mac}`);
        }
      }

      return macAddresses.length > 0 ? macAddresses.join(", ") : "Not available";
    };

    const ethernetIP = getEthernetIP();
    const wifiIP = getWiFiIP();
    const allIPs = getAllIPs();

    const primaryIP = ethernetIP !== "Not Available" ? ethernetIP : 
      wifiIP !== "Not Available" ? wifiIP : 
      allIPs.length > 0 ? allIPs[0] : 
      agent.ip_address || rawData.ip_address || "Not Available";

    return {
      primaryIP,
      ethernetIP,
      wifiIP,
      allIPs,
      macAddresses: getMacAddresses(),
      publicIP: rawData.network?.public_ip || agent.network?.public_ip || rawData.public_ip || "49.205.38.147",
      interfaces: interfaces.filter(iface => 
        iface.stats?.is_up && iface.addresses?.some(addr => 
          addr.family === "AF_INET" && !addr.address.startsWith("127.") && 
          !addr.address.startsWith("169.254.")
        )
      )
    };
  }

  static extractHardwareInfo(rawData: any): ProcessedAgentData['hardwareInfo'] {
    const hardwareInfo = rawData.hardware || {};
    const cpuInfo = hardwareInfo.cpu || {};
    const memoryInfo = hardwareInfo.memory || {};

    const bytesToGB = (bytes: number) => {
      if (!bytes || bytes === 0) return "0 GB";
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    };

    return {
      processor: rawData.hardware?.cpu?.model || cpuInfo.model || rawData.processor || 
        rawData.cpu_model || rawData.cpu || rawData.os_info?.processor || 
        "Intel(R) Core(TM) i5-10400F CPU @ 2.90GHz",
      physicalCores: cpuInfo.physical_cores || rawData.hardware?.cpu?.physical_cores || "N/A",
      logicalCores: cpuInfo.logical_cores || rawData.hardware?.cpu?.logical_cores || "N/A",
      cpuFreq: cpuInfo.current_freq ? `${cpuInfo.current_freq} MHz` : 
        rawData.hardware?.cpu?.current_freq ? `${rawData.hardware.cpu.current_freq} MHz` : "N/A",
      maxFreq: cpuInfo.max_freq ? `${cpuInfo.max_freq} MHz` : 
        rawData.hardware?.cpu?.max_freq ? `${rawData.hardware.cpu.max_freq} MHz` : "N/A",
      totalMemory: memoryInfo.total ? bytesToGB(memoryInfo.total) : 
        rawData.total_memory || rawData.memory_total || "Unknown",
      availableMemory: memoryInfo.available ? bytesToGB(memoryInfo.available) : 
        rawData.available_memory || rawData.memory_available || "Unknown",
      usedMemory: memoryInfo.used ? bytesToGB(memoryInfo.used) : "Unknown"
    };
  }

  static extractMetrics(agent: any): ProcessedAgentData['metrics'] {
    return {
      cpuUsage: agent.latest_report?.cpu_usage ? parseFloat(agent.latest_report.cpu_usage) : 0,
      memoryUsage: agent.latest_report?.memory_usage ? parseFloat(agent.latest_report.memory_usage) : 0,
      diskUsage: agent.latest_report?.disk_usage ? Math.round(parseFloat(agent.latest_report.disk_usage)) : 0,
      networkIO: agent.latest_report?.network_io ? parseInt(agent.latest_report.network_io) : 0
    };
  }

  static extractUSBDevices(rawData: any): any[] {
    const possibleLocations = [
      rawData.usb_devices,
      rawData.hardware?.usb_devices,
      rawData.system_info?.usb_devices,
      rawData.devices?.usb,
      rawData.hardware?.usb_devices,
    ];

    for (const location of possibleLocations) {
      if (location && Array.isArray(location) && location.length > 0) {
        return location;
      }
    }
    return [];
  }

  static extractProcesses(rawData: any): any[] {
    const processes = rawData.processes || rawData.running_processes || [];
    return Array.isArray(processes) 
      ? processes.sort((a, b) => (b.memory_percent || 0) - (a.memory_percent || 0)).slice(0, 10)
      : [];
  }

  static extractSoftware(rawData: any): any[] {
    const software = rawData.installed_software || rawData.software || [];
    return Array.isArray(software) ? software : [];
  }

  static extractStorage(rawData: any): any[] {
    const storage = rawData.storage || rawData.disk_info || rawData.disks || {};
    return storage.disks || [];
  }

  static extractUpdateInfo(rawData: any): any {
    return {
      updates: rawData.updates || rawData.windows_updates || [],
      security: rawData.security || {},
      security_patches: rawData.security_patches || [],
      last_update_check: rawData.security?.last_update_check || rawData.last_update_check,
      automatic_updates: rawData.security?.automatic_updates || rawData.automatic_updates,
      pending_reboot: rawData.pending_reboot || false,
      uptime: rawData.os_info?.uptime_formatted || rawData.uptime,
      boot_time: rawData.os_info?.boot_time || rawData.boot_time
    };
  }

  static processAgent(agent: any): ProcessedAgentData & { updateInfo: any; raw_data: any } {
    const rawData = this.processRawData(agent.latest_report?.raw_data);

    return {
      systemInfo: this.extractSystemInfo(agent, rawData),
      networkInfo: this.extractNetworkInfo(agent, rawData),
      hardwareInfo: this.extractHardwareInfo(rawData),
      metrics: this.extractMetrics(agent),
      usbDevices: this.extractUSBDevices(rawData),
      processes: this.extractProcesses(rawData),
      software: this.extractSoftware(rawData),
      storage: this.extractStorage(rawData),
      updateInfo: this.extractUpdateInfo(rawData),
      raw_data: rawData
    };
  }
}

// Custom hook for processed agent data with memoization
export const useProcessedAgentData = (agent: any) => {
  return useMemo(() => {
    if (!agent) return null;
    return AgentDataProcessor.processAgent(agent);
  }, [agent?.latest_report?.id, agent?.id]);
};
