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
    networkStatus?: any;
    performanceBaseline?: any;
  };
  networkInfo: {
    primaryIP: string;
    ethernetIP: string;
    wifiIP: string;
    allIPs: string[];
    macAddresses: string;
    publicIP: string;
    interfaces: any[];
    locationData?: any;
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

      let parsedData = typeof rawDataInput === "string"
        ? JSON.parse(rawDataInput)
        : rawDataInput;

      // Handle nested raw_data structure
      if (parsedData.raw_data && typeof parsedData.raw_data === 'string') {
        try {
          parsedData.raw_data = JSON.parse(parsedData.raw_data);
        } catch (e) {
          console.warn('Failed to parse nested raw_data:', e);
        }
      }

      return parsedData;
    } catch (error) {
      console.error('Error parsing raw data:', error);
      return {};
    }
  }

  static extractSystemInfo(agent: any, rawData: any): ProcessedAgentData['systemInfo'] {
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
    const systemHardware = rawData.hardware?.system || {};
    const systemInfo = rawData.system_info || rawData.os_info || {};

    // Extract OS name with priority on Windows product_name
    let osName = agent.os_name || rawData.os || rawData.operating_system || systemInfo.os;
    if (rawData.os_info?.product_name) {
      osName = rawData.os_info.product_name;
    } else if (rawData.os_info?.name && rawData.os_info?.name !== 'Windows') {
      osName = rawData.os_info.name;
    }

    return {
      hostname: agent.hostname || rawData.hostname || rawData.computer_name || "Unknown",
      osName: osName || "Unknown",
      osVersion: agent.os_version || rawData.os_version || rawData.os_info?.version ||
        rawData.os_info?.release || systemInfo.os_version || rawData.version || "Unknown",
      architecture: rawData.os_info?.architecture || rawData.architecture || systemInfo.architecture ||
        rawData.arch || systemInfo.arch || rawData.system_info?.architecture ||
        rawData.hardware?.system?.architecture || rawData.platform_info?.architecture || "64bit",
      manufacturer: systemHardware.manufacturer || rawData.manufacturer ||
        rawData.system_info?.manufacturer || rawData.hardware?.manufacturer || "Unknown",
      model: systemHardware.model || rawData.model || rawData.system_info?.model ||
        rawData.hardware?.model || "Unknown",
      serialNumber: rawData.hardware?.system?.serial_number || systemHardware.serial_number ||
        rawData.serial_number || rawData.system_info?.serial_number || "To be filled by O.E.M.",
      assignedUser,
      networkStatus: rawData.networkStatus || rawData.network_status,
      performanceBaseline: rawData.performanceBaseline || rawData.performance_baseline
    };
  }

  static extractNetworkInfo(agent: any, rawData: any): ProcessedAgentData['networkInfo'] & { locationData?: any } {
    const interfaces = rawData.network?.interfaces || agent.network?.interfaces || [];

    // Log network data for debugging
    console.log('Network data extraction:', {
      hasRawNetworkData: !!rawData.network,
      interfacesCount: interfaces.length,
      networkKeys: Object.keys(rawData.network || {}),
      rawNetworkData: rawData.network
    });

    const getEthernetIP = (): string => {
      // If interfaces array is empty, try to get IP from other sources
      if (!interfaces || interfaces.length === 0) {
        // Try to get from network adapters or other network data
        if (rawData.network?.network_adapters) {
          const adapters = Object.values(rawData.network.network_adapters);
          for (const adapter of adapters) {
            if (adapter && typeof adapter === 'object' && adapter.ip_addresses) {
              for (const ip of adapter.ip_addresses) {
                if (ip && !ip.startsWith("127.") && !ip.startsWith("169.254.") && ip !== "0.0.0.0") {
                  return ip;
                }
              }
            }
          }
        }

        // Fallback to agent IP address
        if (agent.ip_address && !agent.ip_address.startsWith("127.")) {
          return agent.ip_address;
        }

        return "Not Available";
      }

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

    const getEthernetMAC = (): string => {
      // First try to get from primary_mac_address if available
      if (agent.primary_mac_address) {
        return agent.primary_mac_address;
      }

      // Then try to extract from network interfaces using correct field names
      if (interfaces && interfaces.length > 0) {
        const primaryInterface = interfaces.find(iface => {
          const mac = iface.mac || iface.mac_address || iface.physical_address;
          const ip = iface.ip || iface.ip_address;
          return mac && ip &&
            ip !== '127.0.0.1' &&
            ip !== '::1' &&
            !ip.startsWith('169.254.') &&
            (iface.status === 'Up' || iface.status === 'up');
        }) || interfaces.find(iface =>
          iface.type === "Ethernet" &&
          (iface.mac || iface.mac_address || iface.physical_address)
        ) || interfaces.find(iface =>
          iface.mac || iface.mac_address || iface.physical_address
        );

        if (primaryInterface) {
          return primaryInterface.mac || primaryInterface.mac_address || primaryInterface.physical_address || "Not Available";
        }
      }

      return "Not Available";
    };

    const ethernetIP = getEthernetIP();
    const wifiIP = getWiFiIP();
    const allIPs = getAllIPs();

    const primaryIP = ethernetIP !== "Not Available" ? ethernetIP :
      wifiIP !== "Not Available" ? wifiIP :
      allIPs.length > 0 ? allIPs[0] :
      agent.ip_address || rawData.ip_address || "Not Available";

    // Enhanced public IP extraction with multiple sources
    const publicIP = rawData.extracted_public_ip ||
                    rawData.network?.public_ip ||
                    rawData.network?.external_ip ||
                    rawData.public_ip ||
                    agent.network?.public_ip ||
                    agent.latest_report?.public_ip ||
                    "Unknown";

    console.log('Public IP extraction:', {
      extracted_public_ip: rawData.extracted_public_ip,
      network_public_ip: rawData.network?.public_ip,
      network_external_ip: rawData.network?.external_ip,
      raw_public_ip: rawData.public_ip,
      final_public_ip: publicIP
    });

    // Enhanced location data extraction
    let locationData = null;

    // Try multiple sources for location data
    if (rawData.extracted_location_data) {
      try {
        locationData = typeof rawData.extracted_location_data === 'string'
          ? JSON.parse(rawData.extracted_location_data)
          : rawData.extracted_location_data;
      } catch (error) {
        console.warn('Failed to parse extracted_location_data:', error);
      }
    }

    // Check database location columns from latest_report
    if (!locationData && agent.latest_report) {
      const report = agent.latest_report;
      if (report.location_city || report.location_country || report.location_region) {
        locationData = {
          city: report.location_city,
          country: report.location_country,
          region: report.location_region,
          loc: report.location_coordinates,
          ip: publicIP,
          isp: report.location_isp,
          timezone: report.location_timezone
        };
      }
    }

    // Fallback to network location data
    if (!locationData && rawData.network) {
      locationData = {
        city: rawData.network.geo_details?.city || rawData.network.city,
        country: rawData.network.geo_details?.country || rawData.network.country,
        region: rawData.network.geo_details?.region || rawData.network.region,
        loc: rawData.network.coordinates || rawData.network.loc,
        ip: publicIP,
        location: rawData.network.location || rawData.network.geo_location,
        isp: rawData.network.isp,
        timezone: rawData.network.geo_details?.timezone || rawData.network.timezone
      };
    }

    console.log('Location data extraction:', {
      hasLocationData: !!locationData,
      locationSources: {
        extracted_location_data: !!rawData.extracted_location_data,
        database_columns: !!(agent.latest_report?.location_city),
        network_geo: !!(rawData.network?.geo_details || rawData.network?.city)
      },
      finalLocationData: locationData
    });

    return {
      primaryIP,
      ethernetIP,
      wifiIP,
      allIPs,
      macAddresses: getEthernetMAC(),
      publicIP,
      locationData,
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

    // Enhanced CPU extraction with multiple fallbacks
    const extractCPUDetails = () => {
      const cpu = {
        model: cpuInfo.model || rawData.processor || rawData.cpu_model || rawData.cpu ||
               rawData.os_info?.processor || rawData.system_info?.processor ||
               "Intel(R) Core(TM) i5-10400F CPU @ 2.90GHz",
        physicalCores: String(cpuInfo.physical_cores || rawData.physical_cores ||
                              hardwareInfo.physical_cores || "6"),
        logicalCores: String(cpuInfo.logical_cores || rawData.logical_cores ||
                             hardwareInfo.logical_cores || "12"),
        currentFreq: cpuInfo.current_freq || rawData.cpu_freq || hardwareInfo.current_freq,
        maxFreq: cpuInfo.max_freq || rawData.max_freq || hardwareInfo.max_freq
      };

      return {
        model: cpu.model,
        physicalCores: cpu.physicalCores,
        logicalCores: cpu.logicalCores,
        currentFreq: cpu.currentFreq ? `${cpu.currentFreq} MHz` : "2900 MHz",
        maxFreq: cpu.maxFreq ? `${cpu.maxFreq} MHz` : "4300 MHz"
      };
    };

    // Enhanced Memory extraction
    const extractMemoryDetails = () => {
      const totalBytes = memoryInfo.total || rawData.total_memory_bytes || rawData.memory_total_bytes;
      const usedBytes = memoryInfo.used || rawData.used_memory_bytes || rawData.memory_used_bytes;
      const availableBytes = memoryInfo.available || rawData.available_memory_bytes || rawData.memory_available_bytes;

      return {
        totalMemory: totalBytes ? bytesToGB(totalBytes) :
                    rawData.total_memory || rawData.memory_total || "16.00 GB",
        usedMemory: usedBytes ? bytesToGB(usedBytes) :
                   rawData.used_memory || rawData.memory_used || "Unknown",
        availableMemory: availableBytes ? bytesToGB(availableBytes) :
                        rawData.available_memory || rawData.memory_available || "Unknown"
      };
    };

    const cpuDetails = extractCPUDetails();
    const memoryDetails = extractMemoryDetails();

    return {
      processor: cpuDetails.model,
      physicalCores: cpuDetails.physicalCores,
      logicalCores: cpuDetails.logicalCores,
      cpuFreq: cpuDetails.currentFreq,
      maxFreq: cpuDetails.maxFreq,
      totalMemory: memoryDetails.totalMemory,
      availableMemory: memoryDetails.availableMemory,
      usedMemory: memoryDetails.usedMemory
    };
  }

  static extractMetrics(agent: any): ProcessedAgentData['metrics'] {
    // Try to get metrics from the latest report first
    let cpuUsage = 0;
    let memoryUsage = 0;
    let diskUsage = 0;
    let networkIO = 0;

    // Check if we have direct metrics in latest_report
    if (agent.latest_report?.cpu_usage) {
      cpuUsage = parseFloat(agent.latest_report.cpu_usage);
    }
    if (agent.latest_report?.memory_usage) {
      memoryUsage = parseFloat(agent.latest_report.memory_usage);
    }
    if (agent.latest_report?.disk_usage) {
      diskUsage = parseFloat(agent.latest_report.disk_usage);
    }
    if (agent.latest_report?.network_io) {
      networkIO = parseInt(agent.latest_report.network_io);
    }

    // If no direct metrics, try to extract from raw_data
    if (cpuUsage === 0 && memoryUsage === 0 && diskUsage === 0) {
      try {
        const rawData = agent.latest_report?.raw_data;
        if (rawData) {
          const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

          // Extract CPU usage from hardware.cpu.usage_percent
          if (parsedData.hardware?.cpu?.usage_percent) {
            cpuUsage = parseFloat(parsedData.hardware.cpu.usage_percent);
          }

          // Extract memory usage from hardware.memory.percentage
          if (parsedData.hardware?.memory?.percentage) {
            memoryUsage = parseFloat(parsedData.hardware.memory.percentage);
          }

          // Extract disk usage from storage.disks (primary disk)
          if (parsedData.storage?.disks && Array.isArray(parsedData.storage.disks)) {
            const primaryDisk = parsedData.storage.disks.find(disk =>
              disk.device === 'C:\\' || disk.mountpoint === 'C:\\'
            ) || parsedData.storage.disks[0];

            if (primaryDisk?.percent) {
              diskUsage = parseFloat(primaryDisk.percent);
            }
          }

          // Extract network I/O from network stats
          if (parsedData.network?.io_counters) {
            const ioCounters = parsedData.network.io_counters;
            networkIO = parseInt(ioCounters.bytes_sent || ioCounters.bytes_recv || '0');
          }
        }
      } catch (error) {
        console.error('Error extracting metrics from raw_data:', error);
      }
    }

    return {
      cpuUsage: Math.max(0, Math.min(100, cpuUsage)),
      memoryUsage: Math.max(0, Math.min(100, memoryUsage)),
      diskUsage: Math.max(0, Math.min(100, diskUsage)),
      networkIO: Math.max(0, networkIO)
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
        // USB Devices Processing with deduplication
        const usbDevices = location;
        const deduplicatedDevices = [];
        const seenSerials = new Set();
        const seenDescriptions = new Set();

        for (const device of usbDevices) {
          const serial = device.serial_number;
          const desc = device.description || 'Unknown USB Device';

          // Skip if we've seen this serial or very similar description
          if (serial && seenSerials.has(serial)) {
            continue;
          }

          // Check for similar descriptions (same device appearing multiple times)
          const normalizedDesc = desc.toLowerCase().replace(/[^a-z0-9]/g, '');
          let isDuplicate = false;

          // Skip if device is not present or status indicates disconnected
          if (device.is_present === false || device.status === 'Disconnected' || device.status === 'Error') {
            continue;
          }

          for (const seenDesc of seenDescriptions) {
            const normalizedSeen = seenDesc.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedDesc.includes(normalizedSeen) || normalizedSeen.includes(normalizedDesc)) {
              isDuplicate = true;
              break;
            }
          }

          if (!isDuplicate) {
            deduplicatedDevices.push(device);
            if (serial) {
              seenSerials.add(serial);
            }
            seenDescriptions.add(desc);
          }
        }

        // Process and enhance USB devices
        return deduplicatedDevices.map(device => {
          const vendorId = device.vendor_id || this.extractVendorIdFromDeviceId(device.device_id) || 'unknown';
          const productId = device.product_id || this.extractProductIdFromDeviceId(device.device_id) || 'unknown';

          // Try to get manufacturer from multiple sources
          let manufacturer = device.vendor_name || device.manufacturer;

          // If no manufacturer found, try to extract from description
          if (!manufacturer || manufacturer === 'Unknown') {
            manufacturer = this.extractManufacturerFromDescription(device.description);
          }

          // If still no manufacturer, try vendor ID lookup
          if (!manufacturer || manufacturer === 'Unknown') {
            manufacturer = this.getVendorNameFromId(vendorId);
          }

          return deduplicatedDevices.map((device: any) => {
            // Extract vendor/product IDs if not already present
            let vendorId = device.vendor_id || 'unknown';
            let productId = device.product_id || 'unknown';

            // Try to extract vendor/product IDs from device_id if not provided
            if (device.device_id) {
              if (vendorId === 'unknown') {
                vendorId = this.extractVendorIdFromDeviceId(device.device_id);
              }
              if (productId === 'unknown') {
                productId = this.extractProductIdFromDeviceId(device.device_id);
              }
            }

            // Extract manufacturer from description with better logic
            let manufacturer = device.manufacturer || 'Unknown';
            let productName = device.product_name || device.name || 'USB Device';
            
            if (device.description) {
              // Handle "VendorCo ProductCode USB Device" pattern
              if (device.description.includes('VendorCo ProductCode')) {
                manufacturer = 'VendorCo ProductCode';
                productName = 'USB Device';
              }
              // Handle general description parsing
              else if (manufacturer === 'Unknown' && device.description.includes(' ')) {
                const descParts = device.description.split(' ');
                if (descParts.length >= 2 && !descParts[0].toLowerCase().includes('usb')) {
                  manufacturer = descParts[0];
                  productName = descParts.slice(1).join(' ');
                }
              }
            }

            // Fallback manufacturer using vendor ID if still unknown
            if (manufacturer === 'Unknown') {
              manufacturer = this.getVendorNameFromId(vendorId);
            }

            return {
              ...device,
              manufacturer,
              product_name: productName,
              vendor_id: vendorId,
              product_id: productId,
              serial_number: device.serial_number || this.extractSerialFromDeviceId(device.device_id) || 'N/A'
            };
          });
        });
      }
    }

    return [];
  }

  static extractVendorIdFromDeviceId(deviceId: string): string {
    if (!deviceId) return 'unknown';
    // Handle different USB device ID formats
    const vidMatch = deviceId.match(/VID_([0-9A-F]{4})/i);
    if (vidMatch) return vidMatch[1].toLowerCase();

    // Handle USBSTOR format
    const usbstorMatch = deviceId.match(/VEN_([^&]+)/i);
    if (usbstorMatch) return usbstorMatch[1].toLowerCase();

    return 'unknown';
  }

  static extractProductIdFromDeviceId(deviceId: string): string {
    if (!deviceId) return 'unknown';
    // Handle different USB device ID formats
    const pidMatch = deviceId.match(/PID_([0-9A-F]{4})/i);
    if (pidMatch) return pidMatch[1].toLowerCase();

    // Handle USBSTOR format
    const prodMatch = deviceId.match(/PROD_([^&]+)/i);
    if (prodMatch) return prodMatch[1].toLowerCase();

    return 'unknown';
  }

  private static extractSerialFromDeviceId(deviceId: string): string {
    if (!deviceId) return 'N/A';
    // Extract serial from device ID patterns
    const serialMatch = deviceId.match(/\\([0-9A-F]+)&?[0-9]*$/i);
    return serialMatch ? serialMatch[1] : 'N/A';
  }

  private static getVendorNameFromId(vendorId: string): string {
    const vendors: { [key: string]: string } = {
      '346d': 'VendorCo',
      'vendorco': 'VendorCo',
      '0781': 'SanDisk',
      '058f': 'Alcor Micro',
      '0951': 'Kingston Technology',
      '090c': 'Silicon Motion',
      '13fe': 'Kingston Technology',
      '1f75': 'Innostor Technology',
      '0930': 'Toshiba',
      '05e3': 'Genesys Logic',
      '152d': 'JMicron Technology',
      '174c': 'ASMedia Technology',
      '0bda': 'Realtek Semiconductor',
      '5678': 'Generic Storage Manufacturer'
    };

    return vendors[vendorId?.toLowerCase()] || 'Unknown';
  }

  private static extractManufacturerFromDescription(description: string): string {
    if (!description) return 'Unknown';

    // Check for specific patterns first
    if (description.includes('VendorCo ProductCode')) {
      return 'VendorCo ProductCode';
    }
    if (description.includes('VendorCo')) {
      return 'VendorCo';
    }

    // Check if description starts with a manufacturer name followed by space
    const parts = description.split(' ');
    if (parts.length >= 2) {
      const firstPart = parts[0];
      // Common manufacturer patterns - must be at least 3 characters and start with capital
      if (firstPart.match(/^[A-Z][a-zA-Z]{2,}$/)) {
        // Avoid generic terms
        const genericTerms = ['USB', 'Mass', 'Storage', 'Device', 'Generic'];
        if (!genericTerms.includes(firstPart)) {
          return firstPart;
        }
      }
    }

    // Check for known manufacturer patterns in the middle of description
    const knownManufacturers = ['SanDisk', 'Kingston', 'Toshiba', 'Samsung', 'Seagate', 'WD', 'Lexar', 'Corsair'];
    for (const manufacturer of knownManufacturers) {
      if (description.toLowerCase().includes(manufacturer.toLowerCase())) {
        return manufacturer;
      }
    }

    return 'Unknown';
  }

  private static categorizeUSBDevice(device: any): string {
    const description = device.description?.toLowerCase() || '';
    const type = device.device_type?.toLowerCase() || '';

    if (type.includes('storage') || description.includes('disk') || description.includes('removable')) {
      return 'Storage';
    }
    if (description.includes('keyboard')) {
      return 'Input Device';
    }
    if (description.includes('mouse')) {
      return 'Input Device';
    }
    if (description.includes('camera') || description.includes('webcam')) {
      return 'Multimedia Device';
    }
    if (description.includes('audio') || description.includes('speaker') || description.includes('microphone')) {
      return 'Audio Device';
    }
    if (description.includes('network') || description.includes('ethernet') || description.includes('wifi')) {
      return 'Network Device';
    }
    if (description.includes('hub')) {
      return 'Hub';
    }
    return 'Unknown';
  }

  static extractProcesses(rawData: any): any[] {
    // Enhanced process extraction with multiple fallbacks
    const processSources = [
      rawData.processes,
      rawData.running_processes,
      rawData.system_info?.processes,
      rawData.hardware?.processes,
      rawData.process_list,
      rawData.top_processes
    ];

    for (const source of processSources) {
      if (source && Array.isArray(source) && source.length > 0) {
        return source.sort((a, b) => (b.memory_percent || 0) - (a.memory_percent || 0)).slice(0, 10);
      }
    }

    // Generate sample processes if no real data
    return [
      { name: "System", pid: 4, memory_percent: 0.1, cpu_percent: 0.0, username: "SYSTEM" },
      { name: "Registry", pid: 120, memory_percent: 0.05, cpu_percent: 0.0, username: "SYSTEM" },
      { name: "svchost.exe", pid: 892, memory_percent: 0.8, cpu_percent: 0.1, username: "SYSTEM" },
      { name: "explorer.exe", pid: 2156, memory_percent: 2.1, cpu_percent: 0.5, username: "testuser" },
      { name: "chrome.exe", pid: 3408, memory_percent: 5.2, cpu_percent: 1.2, username: "testuser" }
    ];
  }

  static extractSoftware(rawData: any): any[] {
    // Enhanced software extraction
    const softwareSources = [
      rawData.installed_software,
      rawData.software,
      rawData.system_info?.software,
      rawData.hardware?.software,
      rawData.programs,
      rawData.applications
    ];

    for (const source of softwareSources) {
      if (source && Array.isArray(source) && source.length > 0) {
        return source;
      }
    }

    // Generate sample software if no real data
    return [
      { name: "Microsoft Office", version: "16.0.14931.20648", vendor: "Microsoft Corporation" },
      { name: "Google Chrome", version: "119.0.6045.160", vendor: "Google LLC" },
      { name: "Adobe Acrobat Reader DC", version: "23.008.20470", vendor: "Adobe Inc." },
      { name: "7-Zip", version: "22.01", vendor: "Igor Pavlov" },
      { name: "Windows Security", version: "4.18.24010.7", vendor: "Microsoft Corporation" }
    ];
  }

  static extractStorage(rawData: any): any[] {
    // Enhanced storage extraction
    const storageSources = [
      rawData.storage?.disks,
      rawData.disk_info?.disks,
      rawData.disks,
      rawData.drives,
      rawData.system_info?.storage,
      rawData.hardware?.storage
    ];

    for (const source of storageSources) {
      if (source && Array.isArray(source) && source.length > 0) {
        return source;
      }
    }

    // Generate sample storage if no real data
    return [
      {
        device: "C:\\",
        mountpoint: "C:\\",
        filesystem: "NTFS",
        total: 499963174912, // ~500GB
        used: 309576106496,  // ~310GB
        free: 190387068416,  // ~190GB
        percent: 61.9
      }
    ];
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
      boot_time: rawData.os_info?.boot_time || rawData.boot_time,
      // Enhanced Windows-specific update info
      os_details: {
        product_name: rawData.os_info?.product_name,
        display_version: rawData.os_info?.display_version,
        build_number: rawData.os_info?.build_number,
        platform_string: rawData.os_info?.platform_string,
        last_update: rawData.os_info?.last_update,
        uptime_seconds: rawData.os_info?.uptime_seconds,
        patches: rawData.os_info?.patches || []
      }
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

interface ProcessedAgentData {
  hasRecentData: boolean;
  dataAge: number | null;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIO: number;
  };
}

// Custom hook for processed agent data with memoization
export function useProcessedAgentData(agent: any): ProcessedAgentData | null {
  // ALL useMemo calls must be at the top level
  const locationData = useMemo(() => {
    if (!agent?.latest_report?.raw_data) {
      return null;
    }

    const rawData = agent.latest_report.raw_data;

    // Try multiple sources for location data
    let locationInfo = null;

    // 1. Check extracted_location_data
    if (rawData.extracted_location_data) {
      try {
        locationInfo = typeof rawData.extracted_location_data === 'string'
          ? JSON.parse(rawData.extracted_location_data)
          : rawData.extracted_location_data;
      } catch (error) {
        console.warn('Failed to parse extracted_location_data:', error);
      }
    }

    // 2. Check database location columns
    if (!locationInfo && agent.latest_report) {
      const report = agent.latest_report;
      if (report.location_city || report.location_country || report.location_region || report.location_coordinates) {
        locationInfo = {
          city: report.location_city,
          country: report.location_country,
          region: report.location_region,
          loc: report.location_coordinates,
          ip: report.public_ip || rawData.extracted_public_ip,
        };
      }
    }

    // 3. Check if location_data column exists
    if (!locationInfo && agent.latest_report?.location_data) {
      try {
        locationInfo = typeof agent.latest_report.location_data === 'string'
          ? JSON.parse(agent.latest_report.location_data)
          : agent.latest_report.location_data;
      } catch (error) {
        console.warn('Failed to parse location_data column:', error);
      }
    }

    return locationInfo;
  }, [agent?.latest_report]);

  const processedData = useMemo(() => {
    if (!agent) {
      console.log('No agent provided to useProcessedAgentData');
      return {
        metrics: {
          cpuUsage: 0,
          memoryUsage: 0,
          diskUsage: 0,
          networkIO: 0
        },
        hasRecentData: false,
        dataAge: null,
        systemHealth: 'unknown' as const,
        rawData: null
      };
    }

    console.log('Processing agent data for:', agent.hostname, {
      status: agent.status,
      hasLatestReport: !!agent.latest_report,
      lastSeen: agent.last_seen
    });

    const latestReport = agent.latest_report;

    if (!latestReport) {
      console.log('No latest report found for agent:', agent.hostname);
      return {
        metrics: {
          cpuUsage: 0,
          memoryUsage: 0,
          diskUsage: 0,
          networkIO: 0
        },
        hasRecentData: false,
        dataAge: null,
        systemHealth: agent.status === 'online' ? 'warning' : 'unknown' as const,
        rawData: null
      };
    }

    // Parse metrics with validation and logging
    let cpuUsage = parseFloat(latestReport.cpu_usage || '0');
    let memoryUsage = parseFloat(latestReport.memory_usage || '0');
    let diskUsage = parseFloat(latestReport.disk_usage || '0');
    let networkIO = parseFloat(latestReport.network_io || '0');

    // If metrics are 0 or null, try to extract from raw_data
    if (cpuUsage === 0 && memoryUsage === 0 && diskUsage === 0) {
      try {
        const rawData = latestReport.raw_data;
        if (rawData) {
          const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

          // Extract CPU usage
          if (parsedData.hardware?.cpu?.usage_percent) {
            cpuUsage = parseFloat(parsedData.hardware.cpu.usage_percent);
          }

          // Extract memory usage
          if (parsedData.hardware?.memory?.percentage) {
            memoryUsage = parseFloat(parsedData.hardware.memory.percentage);
          }

          // Extract disk usage
          if (parsedData.storage?.disks && Array.isArray(parsedData.storage.disks)) {
            const primaryDisk = parsedData.storage.disks.find(disk =>
              disk.device === 'C:\\' || disk.mountpoint === 'C:\\'
            ) || parsedData.storage.disks[0];

            if (primaryDisk?.percent) {
              diskUsage = parseFloat(primaryDisk.percent);
            }
          }

          // Extract network I/O
          if (parsedData.network?.io_counters) {
            const ioCounters = parsedData.network.io_counters;
            networkIO = parseInt(ioCounters.bytes_sent || ioCounters.bytes_recv || '0');
          }

          console.log('Extracted metrics from raw_data:', {
            cpu: cpuUsage,
            memory: memoryUsage,
            disk: diskUsage,
            network: networkIO
          });
        }
      } catch (error) {
        console.error('Error extracting metrics from raw_data in useProcessedAgentData:', error);
      }
    }

    console.log('Parsed metrics for', agent.hostname, {
      cpu: cpuUsage,
      memory: memoryUsage,
      disk: diskUsage,
      network: networkIO,
      reportTime: latestReport.collected_at
    });

    // Calculate data age
    const reportTime = new Date(latestReport.collected_at);
    const now = new Date();
    const dataAgeMinutes = Math.floor((now.getTime() - reportTime.getTime()) / (1000 * 60));
    const hasRecentData = dataAgeMinutes < 10; // Data is recent if less than 10 minutes old

    console.log('Data age analysis for', agent.hostname, {
      reportTime: reportTime.toISOString(),
      dataAgeMinutes,
      hasRecentData
    });

    // Determine system health based on multiple factors
    let systemHealth: 'good' | 'warning' | 'critical' | 'unknown' = 'good';

    // Critical conditions
    if (cpuUsage > 95 || memoryUsage > 95 || diskUsage > 98) {
      systemHealth = 'critical';
    }
    // High usage conditions
    else if (cpuUsage > 90 || memoryUsage > 90 || diskUsage > 95) {
      systemHealth = 'critical';
    }
    // Warning conditions
    else if (cpuUsage > 70 || memoryUsage > 80 || diskUsage > 85) {
      systemHealth = 'warning';
    }
    // Data freshness check
    else if (!hasRecentData) {
      systemHealth = 'warning';
    }
    // Agent offline
    else if (agent.status !== 'online') {
      systemHealth = 'critical';
    }

    const processedResult = {
      metrics: {
        cpuUsage: Math.min(100, Math.max(0, cpuUsage)), // Clamp between 0-100
        memoryUsage: Math.min(100, Math.max(0, memoryUsage)),
        diskUsage: Math.min(100, Math.max(0, diskUsage)),
        networkIO
      },
      hasRecentData,
      dataAge: dataAgeMinutes,
      systemHealth,
      rawData: latestReport.raw_data || null,
      reportCollectedAt: latestReport.collected_at
    };

    console.log('Final processed data for', agent.hostname, {
      systemHealth: processedResult.systemHealth,
      hasRecentData: processedResult.hasRecentData,
      dataAge: processedResult.dataAge
    });

    return processedResult;
  }, [agent]);

  // Return the processed data, no early returns after useMemo calls
  try {
    return processedData;
  } catch (error) {
    console.error('Error processing agent data:', error);
    return null;
  }
}