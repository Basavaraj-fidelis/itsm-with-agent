
class NotificationService {
  private subscribers: Map<string, (data: any) => void> = new Map();

  subscribe(id: string, callback: (data: any) => void) {
    this.subscribers.set(id, callback);
  }

  unsubscribe(id: string) {
    this.subscribers.delete(id);
  }

  notify(data: any) {
    this.subscribers.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error("Error in notification callback:", error);
      }
    });
  }

  async sendAlert(alert: any) {
    this.notify({
      type: "alert",
      data: alert
    });
  }

  async sendDeviceUpdate(device: any) {
    this.notify({
      type: "device_update", 
      data: device
    });
  }
}

export const notificationService = new NotificationService();
