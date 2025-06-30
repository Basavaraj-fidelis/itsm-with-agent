
export class TimeUtils {
  /**
   * Calculate minutes between two dates
   */
  static minutesBetween(date1: Date, date2: Date): number {
    return Math.floor(Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60));
  }

  /**
   * Calculate hours between two dates
   */
  static hoursBetween(date1: Date, date2: Date): number {
    return Math.floor(Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60));
  }

  /**
   * Check if device is online based on last seen timestamp
   */
  static isDeviceOnline(lastSeen: Date | string | null, thresholdMinutes: number = 5): boolean {
    if (!lastSeen) return false;
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const minutesAgo = this.minutesBetween(lastSeenDate, now);
    
    return minutesAgo < thresholdMinutes;
  }

  /**
   * Get device status based on last seen
   */
  static getDeviceStatus(lastSeen: Date | string | null, thresholdMinutes: number = 5): 'online' | 'offline' {
    return this.isDeviceOnline(lastSeen, thresholdMinutes) ? 'online' : 'offline';
  }

  /**
   * Calculate minutes since timestamp
   */
  static minutesSince(timestamp: Date | string | null): number | null {
    if (!timestamp) return null;
    
    const date = new Date(timestamp);
    const now = new Date();
    return this.minutesBetween(date, now);
  }

  /**
   * Format duration in human readable format
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours} hour${hours !== 1 ? 's' : ''}${remainingMinutes > 0 ? ` ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}` : ''}`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return `${days} day${days !== 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}` : ''}`;
    }
  }

  /**
   * Check if date is within SLA time
   */
  static isWithinSLA(startTime: Date, endTime: Date, slaMinutes: number): boolean {
    const actualMinutes = this.minutesBetween(startTime, endTime);
    return actualMinutes <= slaMinutes;
  }

  /**
   * Calculate SLA due date
   */
  static calculateSLADueDate(startTime: Date, slaMinutes: number): Date {
    return new Date(startTime.getTime() + (slaMinutes * 60 * 1000));
  }

  /**
   * Get time remaining until SLA breach
   */
  static getTimeToSLABreach(dueDate: Date | string): { 
    isBreached: boolean; 
    minutesRemaining: number; 
    formatted: string 
  } {
    const due = new Date(dueDate);
    const now = new Date();
    const minutesRemaining = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60));
    
    return {
      isBreached: minutesRemaining <= 0,
      minutesRemaining: Math.max(0, minutesRemaining),
      formatted: minutesRemaining <= 0 ? 'Breached' : this.formatDuration(minutesRemaining)
    };
  }
}
