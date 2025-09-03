
import type { Agent } from "@/types/agent-types";

export interface USBDevice {
  device_id: string;
  description: string;
  manufacturer: string;
  vendor_id: string;
  product_id: string;
  device_type: string;
  connection_time?: string;
  first_seen?: string;
  last_seen?: string;
  is_connected: boolean;
  serial_number?: string;
  total_connections?: number;
  duration_seconds?: number;
}

export class USBDeviceProcessor {
  /**
   * Centralized USB device deduplication using composite key strategy
   */
  static deduplicateUSBDevices(
    currentDevices: any[] = [],
    historicalDevices: any[] = []
  ): USBDevice[] {
    const deviceMap = new Map<string, USBDevice>();

    // Helper function to create consistent composite key
    const createDeviceKey = (device: any): string => {
      const vendorId = this.extractVendorId(device.device_id) || device.vendor_id || 'unknown';
      const productId = this.extractProductId(device.device_id) || device.product_id || 'unknown';
      return `${device.device_id}-${vendorId}-${productId}`;
    };

    // Process historical devices first
    historicalDevices.forEach((device) => {
      if (!device?.device_id) return;

      const key = createDeviceKey(device);
      deviceMap.set(key, {
        ...this.normalizeDevice(device),
        is_connected: false,
        last_seen: device.last_seen || device.disconnection_time
      });
    });

    // Process current devices and merge with historical data
    currentDevices.forEach((device) => {
      if (!device?.device_id) return;

      const key = createDeviceKey(device);
      const existing = deviceMap.get(key);
      const normalizedDevice = this.normalizeDevice(device);

      if (existing) {
        // Merge with existing, preserving historical data
        deviceMap.set(key, {
          ...existing,
          ...normalizedDevice,
          is_connected: true,
          connection_time: existing.connection_time || normalizedDevice.connection_time,
          first_seen: existing.first_seen || normalizedDevice.first_seen,
          last_seen: new Date().toISOString(),
          total_connections: (existing.total_connections || 0) + 1
        });
      } else {
        // Add new device
        deviceMap.set(key, {
          ...normalizedDevice,
          is_connected: true,
          connection_time: normalizedDevice.connection_time || new Date().toISOString(),
          first_seen: normalizedDevice.first_seen || new Date().toISOString(),
          last_seen: new Date().toISOString(),
          total_connections: 1
        });
      }
    });

    return Array.from(deviceMap.values())
      .filter(device => device.device_id)
      .sort((a, b) => {
        // Sort by connection time, most recent first
        const timeA = new Date(a.last_seen || 0).getTime();
        const timeB = new Date(b.last_seen || 0).getTime();
        return timeB - timeA;
      });
  }

  /**
   * Normalize device data to consistent format
   */
  private static normalizeDevice(device: any): USBDevice {
    return {
      device_id: device.device_id || '',
      description: device.description || 'Unknown USB Device',
      manufacturer: this.extractManufacturer(device),
      vendor_id: device.vendor_id || this.extractVendorId(device.device_id) || 'unknown',
      product_id: device.product_id || this.extractProductId(device.device_id) || 'unknown',
      device_type: device.device_type || this.categorizeDevice(device.description || ''),
      connection_time: device.connection_time,
      first_seen: device.first_seen,
      last_seen: device.last_seen,
      is_connected: device.is_connected ?? true,
      serial_number: device.serial_number,
      duration_seconds: device.duration_seconds
    };
  }

  /**
   * Extract manufacturer from device data
   */
  private static extractManufacturer(device: any): string {
    let manufacturer = device.manufacturer || "Unknown";
    
    if (manufacturer === "Unknown" || 
        manufacturer === "(Standard system devices)" || 
        !manufacturer || 
        manufacturer.trim() === "") {
      
      if (device.description) {
        const desc = device.description;
        const knownManufacturers = [
          'Kingston', 'SanDisk', 'Samsung', 'Transcend', 
          'Lexar', 'PNY', 'Corsair'
        ];
        
        for (const mfg of knownManufacturers) {
          if (desc.includes(mfg)) {
            return mfg;
          }
        }
        
        if (desc.toLowerCase().includes("flash") || 
            desc.toLowerCase().includes("drive")) {
          return "Generic Storage Device";
        }
        
        // Extract first meaningful word
        const parts = desc.split(" ");
        const firstMeaningfulWord = parts.find(
          (part) => part.length > 3 && 
          !['USB', 'Mass', 'Storage', 'Device', 'Drive'].includes(part)
        );
        
        manufacturer = firstMeaningfulWord || "Unknown Manufacturer";
      }
    }
    
    return manufacturer;
  }

  /**
   * Extract vendor ID from device ID
   */
  static extractVendorId(deviceId: string): string | null {
    if (!deviceId) return null;
    const match = deviceId.match(/VID_([0-9A-F]{4})/i);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Extract product ID from device ID
   */
  static extractProductId(deviceId: string): string | null {
    if (!deviceId) return null;
    const match = deviceId.match(/PID_([0-9A-F]{4})/i);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Categorize device based on description
   */
  private static categorizeDevice(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('storage') || desc.includes('disk') || 
        desc.includes('drive') || desc.includes('flash')) {
      return 'mass_storage';
    }
    if (desc.includes('keyboard')) return 'keyboard';
    if (desc.includes('mouse')) return 'mouse';
    if (desc.includes('camera') || desc.includes('webcam')) return 'webcam';
    if (desc.includes('audio') || desc.includes('sound')) return 'audio';
    if (desc.includes('network') || desc.includes('ethernet')) return 'network';
    if (desc.includes('printer')) return 'printer';
    if (desc.includes('hub')) return 'hub';
    
    return 'other';
  }
}
