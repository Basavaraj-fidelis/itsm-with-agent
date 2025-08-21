
import { db } from "../db";
import { devices } from "../../shared/schema";
import { eq, ilike, and, or } from "drizzle-orm";

interface DeviceFilters {
  status?: string;
  type?: string;
  search?: string;
}

export class DeviceStorage {
  async getAllDevices(filters: DeviceFilters = {}) {
    try {
      let query = db.select().from(devices);
      
      const conditions = [];
      
      if (filters.status && filters.status !== "all") {
        conditions.push(eq(devices.status, filters.status));
      }
      
      if (filters.search && filters.search.trim() !== "") {
        const searchTerm = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            ilike(devices.hostname, searchTerm),
            ilike(devices.assigned_user, searchTerm),
            ilike(devices.ip_address, searchTerm)
          )
        );
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const result = await query;
      
      return result.map(device => {
        let parsedLatestReport = null;
        
        // Parse latest_report if it exists
        if (device.latest_report) {
          try {
            parsedLatestReport = typeof device.latest_report === 'string' ? 
              JSON.parse(device.latest_report) : device.latest_report;
          } catch (e) {
            console.warn(`Failed to parse latest_report for device ${device.id}:`, e);
            parsedLatestReport = device.latest_report;
          }
        }
        
        return {
          ...device,
          latest_report: parsedLatestReport,
          // Ensure consistent display values
          display_ip: device.ip_address,
          display_hostname: device.hostname
        };
      });
    } catch (error) {
      console.error("Error fetching devices:", error);
      throw error;
    }
  }
  
  async getDeviceById(id: string) {
    try {
      const result = await db.select().from(devices).where(eq(devices.id, id));
      
      if (result.length === 0) {
        return null;
      }
      
      const device = result[0];
      return {
        ...device,
        latest_report: device.latest_report ? 
          (typeof device.latest_report === 'string' ? 
            JSON.parse(device.latest_report) : 
            device.latest_report) : null,
        // Ensure IP address consistency
        display_ip: device.ip_address
      };
    } catch (error) {
      console.error("Error fetching device by ID:", error);
      throw error;
    }
  }
}

export const deviceStorage = new DeviceStorage();
