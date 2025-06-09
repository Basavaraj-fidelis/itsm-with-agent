
import { storage } from "./storage";

export class SmartTicketingService {
  async checkAndCreateSmartTickets(device: any, metrics: any) {
    const tickets = [];

    // Critical disk space
    if (metrics.disk_usage > 95) {
      const existingTicket = await this.checkExistingTicket(device.id, 'disk_critical');
      if (!existingTicket) {
        tickets.push(await this.createTicket({
          type: 'incident',
          priority: 'high',
          title: `Critical Disk Space - ${device.hostname}`,
          description: `System ${device.hostname} has critically low disk space (${metrics.disk_usage.toFixed(1)}% used). Immediate cleanup required.`,
          category: 'storage',
          assigned_user: device.assigned_user,
          device_id: device.id,
          auto_created: true,
          tags: ['disk_space', 'critical', 'auto_generated']
        }));
      }
    }

    // USB security alert
    if (metrics.usbDevices && metrics.usbDevices.length > 0) {
      const hasUnknownUSB = metrics.usbDevices.some(usb => 
        !usb.description.includes('Keyboard') && 
        !usb.description.includes('Mouse') &&
        !usb.description.includes('Audio')
      );
      
      if (hasUnknownUSB) {
        const existingTicket = await this.checkExistingTicket(device.id, 'usb_security');
        if (!existingTicket) {
          tickets.push(await this.createTicket({
            type: 'incident',
            priority: 'medium',
            title: `USB Device Security Alert - ${device.hostname}`,
            description: `Unauthorized USB device detected on ${device.hostname}. Devices: ${metrics.usbDevices.map(u => u.description).join(', ')}`,
            category: 'security',
            assigned_user: device.assigned_user,
            device_id: device.id,
            auto_created: true,
            tags: ['usb', 'security', 'auto_generated']
          }));
        }
      }
    }

    // System offline too long
    if (device.status === 'offline') {
      const lastSeen = new Date(device.last_seen);
      const hoursOffline = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);
      
      if (hoursOffline > 24) {
        const existingTicket = await this.checkExistingTicket(device.id, 'system_offline');
        if (!existingTicket) {
          tickets.push(await this.createTicket({
            type: 'incident',
            priority: 'high',
            title: `System Offline >24h - ${device.hostname}`,
            description: `System ${device.hostname} has been offline for ${Math.round(hoursOffline)} hours. Investigation required.`,
            category: 'availability',
            assigned_user: device.assigned_user,
            device_id: device.id,
            auto_created: true,
            tags: ['offline', 'availability', 'auto_generated']
          }));
        }
      }
    }

    return tickets;
  }

  private async checkExistingTicket(deviceId: string, issueType: string) {
    // Check if ticket already exists for this device and issue type in last 24 hours
    // This would require adding a query to your ticket storage
    return null; // Simplified for now
  }

  private async createTicket(ticketData: any) {
    // Use existing ticket creation logic
    const { db } = await import("./db");
    const { tickets } = await import("../shared/ticket-schema");
    
    const ticketNumber = `AUTO-${Date.now()}`;
    
    const newTicket = await db.insert(tickets).values({
      ticket_number: ticketNumber,
      title: ticketData.title,
      description: ticketData.description,
      type: ticketData.type,
      priority: ticketData.priority,
      status: 'new',
      category: ticketData.category,
      requester_email: ticketData.assigned_user || 'system@company.com',
      tags: ticketData.tags,
      metadata: {
        auto_created: true,
        device_id: ticketData.device_id,
        issue_type: ticketData.category
      }
    }).returning();

    return newTicket[0];
  }
}

export const smartTicketing = new SmartTicketingService();
