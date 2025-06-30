import { storage } from "../storage";

export interface SoftwarePackage {
  id: string;
  name: string;
  version: string;
  installer_path: string;
  silent_install_args: string;
  prerequisites: string[];
  supported_os: string[];
  size_mb: number;
}

export interface DeploymentTask {
  id: string;
  device_id: string;
  package_id: string;
  status: "scheduled" | "downloading" | "installing" | "completed" | "failed";
  scheduled_time: Date;
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  progress_percentage: number;
}

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  target_os: string[];
  settings: Record<string, any>;
  enforcement_mode: "advisory" | "enforced";
  created_by: string;
}

class AutomationService {
  private deploymentQueue: Map<string, DeploymentTask[]> = new Map();
  private softwarePackages: SoftwarePackage[] = [
    {
      id: "chrome-latest",
      name: "Google Chrome",
      version: "latest",
      installer_path: "/software/chrome_installer.exe",
      silent_install_args: "/silent /install",
      prerequisites: [],
      supported_os: ["Windows"],
      size_mb: 95,
    },
    {
      id: "firefox-latest",
      name: "Mozilla Firefox",
      version: "latest",
      installer_path: "/software/firefox_installer.exe",
      silent_install_args: "-ms",
      prerequisites: [],
      supported_os: ["Windows", "macOS", "Linux"],
      size_mb: 85,
    },
    {
      id: "zoom-latest",
      name: "Zoom Client",
      version: "latest",
      installer_path: "/software/zoom_installer.exe",
      silent_install_args: "/quiet",
      prerequisites: [],
      supported_os: ["Windows", "macOS"],
      size_mb: 120,
    },
  ];

  async scheduleDeployment(
    deviceIds: string[],
    packageId: string,
    scheduledTime: Date,
  ): Promise<string[]> {
    const deploymentIds: string[] = [];
    const softwarePackage = this.softwarePackages.find(
      (p) => p.id === packageId,
    );

    if (!softwarePackage) {
      throw new Error(`Software package ${packageId} not found`);
    }

    for (const deviceId of deviceIds) {
      const device = await storage.getDevice(deviceId);
      if (!device) continue;

      // Check OS compatibility
      if (!softwarePackage.supported_os.includes(device.os_name || "")) {
        console.log(`Skipping ${deviceId}: OS ${device.os_name} not supported`);
        continue;
      }

      const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const task: DeploymentTask = {
        id: deploymentId,
        device_id: deviceId,
        package_id: packageId,
        status: "scheduled",
        scheduled_time: scheduledTime,
        progress_percentage: 0,
      };

      // Add to queue
      if (!this.deploymentQueue.has(deviceId)) {
        this.deploymentQueue.set(deviceId, []);
      }
      this.deploymentQueue.get(deviceId)!.push(task);

      // Create alert for tracking
      await storage.createAlert({
        device_id: deviceId,
        category: "automation",
        severity: "info",
        message: `Software deployment scheduled: ${softwarePackage.name}`,
        metadata: {
          deployment_id: deploymentId,
          package_info: softwarePackage,
          scheduled_time: scheduledTime.toISOString(),
          status: "scheduled",
        },
        is_active: true,
      });

      deploymentIds.push(deploymentId);
    }

    return deploymentIds;
  }

  async processDeploymentQueue(): Promise<void> {
    const now = new Date();

    for (const [deviceId, tasks] of this.deploymentQueue) {
      const pendingTasks = tasks.filter(
        (t) => t.status === "scheduled" && t.scheduled_time <= now,
      );

      for (const task of pendingTasks) {
        await this.executeDeployment(task);
      }
    }
  }

  private async executeDeployment(task: DeploymentTask): Promise<void> {
    try {
      task.status = "downloading";
      task.started_at = new Date();
      task.progress_percentage = 10;

      // Update alert
      await this.updateDeploymentStatus(task);

      // Simulate download progress
      await this.simulateProgress(task, 10, 50); // Download phase

      task.status = "installing";
      task.progress_percentage = 50;
      await this.updateDeploymentStatus(task);

      // Simulate installation progress
      await this.simulateProgress(task, 50, 100); // Install phase

      task.status = "completed";
      task.completed_at = new Date();
      task.progress_percentage = 100;

      await this.updateDeploymentStatus(task);

      console.log(`Deployment ${task.id} completed successfully`);
    } catch (error) {
      task.status = "failed";
      task.error_message = error.message;
      await this.updateDeploymentStatus(task);
      console.error(`Deployment ${task.id} failed:`, error);
    }
  }

  private async simulateProgress(
    task: DeploymentTask,
    start: number,
    end: number,
  ): Promise<void> {
    const steps = 5;
    const increment = (end - start) / steps;

    for (let i = 0; i < steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
      task.progress_percentage = start + increment * (i + 1);
      await this.updateDeploymentStatus(task);
    }
  }

  private async updateDeploymentStatus(task: DeploymentTask): Promise<void> {
    // Find and update the alert
    const alerts = await storage.getActiveAlerts();
    const deploymentAlert = alerts.find(
      (alert) => alert.metadata?.deployment_id === task.id,
    );

    if (deploymentAlert) {
      await storage.updateAlert(deploymentAlert.id, {
        metadata: {
          ...deploymentAlert.metadata,
          status: task.status,
          progress_percentage: task.progress_percentage,
          error_message: task.error_message,
          last_updated: new Date().toISOString(),
        },
      });
    }
  }

  async getDeploymentStatus(
    deploymentId: string,
  ): Promise<DeploymentTask | null> {
    for (const tasks of this.deploymentQueue.values()) {
      const task = tasks.find((t) => t.id === deploymentId);
      if (task) return task;
    }
    return null;
  }

  async createConfigurationTemplate(
    name: string,
    description: string,
    targetOS: string[],
    settings: Record<string, any>,
    createdBy: string,
  ): Promise<ConfigurationTemplate> {
    const template: ConfigurationTemplate = {
      id: `config_${Date.now()}`,
      name,
      description,
      target_os: targetOS,
      settings,
      enforcement_mode: "advisory",
      created_by: createdBy,
    };

    // In a real implementation, this would be saved to database
    console.log("Configuration template created:", template);

    return template;
  }

  async applyConfiguration(
    deviceId: string,
    templateId: string,
  ): Promise<void> {
    // Create automation alert for configuration application
    await storage.createAlert({
      device_id: deviceId,
      category: "automation",
      severity: "info",
      message: `Configuration template applied: ${templateId}`,
      metadata: {
        template_id: templateId,
        automation_type: "configuration_management",
        status: "applied",
        applied_at: new Date().toISOString(),
      },
      is_active: true,
    });
  }

  getSoftwarePackages(): SoftwarePackage[] {
    return this.softwarePackages;
  }
}

export const automationService = new AutomationService();

// Start deployment queue processor
setInterval(() => {
  automationService.processDeploymentQueue().catch(console.error);
}, 30000); // Check every 30 seconds
