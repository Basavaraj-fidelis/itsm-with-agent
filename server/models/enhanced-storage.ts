import { db } from "./db";
import { devices, alerts, deviceMetrics, usbDevices, softwareInventory, remoteAccess, deviceAlerts } from "@shared/schema";
import { eq, desc, and, or, gte, lte, inArray, sql } from "drizzle-orm";
import { ALERT_THRESHOLDS, getAlertLevel } from "@shared/alert-thresholds";

export class EnhancedStorage {

  async initializeEnhancedTables() {
    try {
      // Performance baselines table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS performance_baselines (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          metric_type VARCHAR(20) NOT NULL CHECK (metric_type IN ('cpu', 'memory', 'disk', 'network')),
          baseline_value DECIMAL(10,2) NOT NULL,
          variance_threshold DECIMAL(10,2) NOT NULL,
          measurement_period VARCHAR(10) DEFAULT '7d',
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          UNIQUE(device_id, metric_type)
        )
      `);

      // Performance anomalies table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS performance_anomalies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          metric_type VARCHAR(20) NOT NULL,
          current_value DECIMAL(10,2) NOT NULL,
          baseline_value DECIMAL(10,2) NOT NULL,
          deviation_percentage DECIMAL(10,2) NOT NULL,
          severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
          detected_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Resource predictions table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS resource_predictions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('cpu', 'memory', 'disk')),
          current_usage_trend DECIMAL(10,4) NOT NULL,
          predicted_capacity_date TIMESTAMP NOT NULL,
          confidence_level DECIMAL(5,2) NOT NULL,
          recommendation TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Software packages table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS software_packages (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(100) NOT NULL,
          installer_path VARCHAR(500) NOT NULL,
          silent_install_args VARCHAR(255),
          prerequisites JSON DEFAULT '[]'::json,
          supported_os JSON DEFAULT '[]'::json,
          size_mb INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Deployment tasks table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS deployment_tasks (
          id VARCHAR(100) PRIMARY KEY,
          device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          package_id VARCHAR(50) NOT NULL REFERENCES software_packages(id),
          status VARCHAR(20) NOT NULL CHECK (status IN ('scheduled', 'downloading', 'installing', 'completed', 'failed')),
          scheduled_time TIMESTAMP NOT NULL,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          error_message TEXT,
          progress_percentage INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Configuration templates table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS configuration_templates (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          target_os JSON DEFAULT '[]'::json,
          settings JSON NOT NULL,
          enforcement_mode VARCHAR(20) DEFAULT 'advisory' CHECK (enforcement_mode IN ('advisory', 'enforced')),
          created_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Security policies table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS security_policies (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(30) NOT NULL CHECK (type IN ('usb_policy', 'software_whitelist', 'patch_policy')),
          rules JSON NOT NULL,
          enforcement_level VARCHAR(10) NOT NULL CHECK (enforcement_level IN ('warn', 'block', 'audit')),
          is_active BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Vulnerability assessments table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS vulnerability_assessments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          software_name VARCHAR(255) NOT NULL,
          software_version VARCHAR(100) NOT NULL,
          cve_id VARCHAR(20) NOT NULL,
          severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          description TEXT,
          patch_available BOOLEAN DEFAULT false,
          detected_at TIMESTAMP DEFAULT NOW() NOT NULL,
          resolved_at TIMESTAMP
        )
      `);

      // License compliance table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS license_compliance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          software_name VARCHAR(255) NOT NULL,
          licenses_purchased INTEGER NOT NULL,
          licenses_used INTEGER NOT NULL,
          cost_per_license DECIMAL(10,2),
          compliance_status VARCHAR(20) DEFAULT 'compliant' CHECK (compliance_status IN ('compliant', 'over_limit', 'warning')),
          last_audit TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          UNIQUE(software_name)
        )
      `);

      // Software installations table (track what's installed where)
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS software_installations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          software_name VARCHAR(255) NOT NULL,
          version VARCHAR(100),
          vendor VARCHAR(255),
          install_date TIMESTAMP,
          license_key VARCHAR(255),
          installation_path VARCHAR(500),
          discovered_at TIMESTAMP DEFAULT NOW() NOT NULL,
          last_seen TIMESTAMP DEFAULT NOW() NOT NULL,
          UNIQUE(device_id, software_name, version)
        )
      `);

      // USB device history table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS device_usb_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          usb_device_id VARCHAR(255) NOT NULL,
          description VARCHAR(255) NOT NULL,
          vendor_id VARCHAR(10),
          product_id VARCHAR(10),
          first_seen TIMESTAMP DEFAULT NOW() NOT NULL,
          last_seen TIMESTAMP DEFAULT NOW() NOT NULL,
          is_blocked BOOLEAN DEFAULT false,
          block_reason VARCHAR(255),
          UNIQUE(device_id, usb_device_id)
        )
      `);

      // Network topology table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS network_topology (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          connected_device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
          connection_type VARCHAR(50), -- 'switch', 'router', 'direct', etc.
          port_info VARCHAR(100),
          bandwidth_mbps INTEGER,
          latency_ms DECIMAL(10,2),
          discovered_at TIMESTAMP DEFAULT NOW() NOT NULL,
          last_seen TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Patch management table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS patch_management (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          patch_id VARCHAR(100) NOT NULL,
          patch_name VARCHAR(255) NOT NULL,
          severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          category VARCHAR(50), -- 'security', 'bugfix', 'feature', etc.
          release_date DATE,
          install_status VARCHAR(20) DEFAULT 'pending' CHECK (install_status IN ('pending', 'downloading', 'installed', 'failed', 'deferred')),
          install_date TIMESTAMP,
          requires_reboot BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      console.log("Enhanced database tables created successfully");

      // Insert default software packages
      await this.insertDefaultSoftwarePackages();
      await this.insertDefaultSecurityPolicies();
      await this.insertDefaultLicenseData();

    } catch (error) {
      console.error("Error creating enhanced tables:", error);
      throw error;
    }
  }

  async insertDefaultSoftwarePackages() {
    try {
      await db.execute(sql`
        INSERT INTO software_packages (id, name, version, installer_path, silent_install_args, supported_os, size_mb)
        VALUES 
          ('chrome-latest', 'Google Chrome', 'latest', '/software/chrome_installer.exe', '/silent /install', '["Windows"]', 95),
          ('firefox-latest', 'Mozilla Firefox', 'latest', '/software/firefox_installer.exe', '-ms', '["Windows", "macOS", "Linux"]', 85),
          ('zoom-latest', 'Zoom Client', 'latest', '/software/zoom_installer.exe', '/quiet', '["Windows", "macOS"]', 120),
          ('office-365', 'Microsoft Office 365', '2024', '/software/office365_installer.exe', '/configure /silent', '["Windows", "macOS"]', 2500),
          ('teams-latest', 'Microsoft Teams', 'latest', '/software/teams_installer.exe', '/silent', '["Windows", "macOS", "Linux"]', 180)
        ON CONFLICT (id) DO UPDATE SET 
          name = EXCLUDED.name,
          version = EXCLUDED.version,
          updated_at = NOW()
      `);
    } catch (error) {
      console.log("Software packages may already exist:", error);
    }
  }

  async insertDefaultSecurityPolicies() {
    try {
      await db.execute(sql`
        INSERT INTO security_policies (id, name, type, rules, enforcement_level, is_active)
        VALUES 
          ('default-usb-policy', 'Default USB Security Policy', 'usb_policy', 
           '{"allowed_vendor_ids": ["046d", "413c", "045e"], "blocked_vendor_ids": ["1234", "5678"], "allowed_device_types": ["keyboard", "mouse", "webcam"], "blocked_device_types": ["mass_storage", "wireless_adapter"], "require_approval": true}',
           'warn', true),
          ('default-software-whitelist', 'Approved Software List', 'software_whitelist',
           '{"approved_software": ["Google Chrome", "Mozilla Firefox", "Microsoft Office", "Zoom", "Teams"], "auto_block_unknown": false}',
           'audit', true)
        ON CONFLICT (id) DO UPDATE SET 
          rules = EXCLUDED.rules,
          updated_at = NOW()
      `);
    } catch (error) {
      console.log("Security policies may already exist:", error);
    }
  }

  async insertDefaultLicenseData() {
    try {
      await db.execute(sql`
        INSERT INTO license_compliance (software_name, licenses_purchased, licenses_used, cost_per_license)
        VALUES 
          ('Microsoft Office', 100, 85, 149.99),
          ('Adobe Acrobat', 50, 52, 179.88),
          ('Zoom Pro', 75, 68, 14.99),
          ('Slack Pro', 200, 180, 7.25)
        ON CONFLICT (software_name) DO UPDATE SET 
          licenses_used = EXCLUDED.licenses_used,
          updated_at = NOW()
      `);
    } catch (error) {
      console.log("License data may already exist:", error);
    }
  }

  // Enhanced USB device tracking with security analysis
  async trackUSBDeviceWithSecurity(deviceId: string, usbDevice: any) {
    try {
      // Store USB device history
      await db.execute(sql`
        INSERT INTO device_usb_history (device_id, usb_device_id, description, vendor_id, product_id, first_seen, last_seen)
        VALUES (${deviceId}, ${usbDevice.device_id}, ${usbDevice.description}, 
                ${this.extractVendorId(usbDevice.device_id)}, ${this.extractProductId(usbDevice.device_id)}, 
                NOW(), NOW())
        ON CONFLICT (device_id, usb_device_id) 
        DO UPDATE SET last_seen = NOW(), description = EXCLUDED.description
      `);

      // Check against security policies
      await this.checkUSBSecurityPolicy(deviceId, usbDevice);

    } catch (error) {
      console.error("Error tracking USB device:", error);
    }
  }

  private extractVendorId(deviceId: string): string {
    const match = deviceId.match(/VID_([0-9A-F]{4})/i);
    return match ? match[1].toLowerCase() : "unknown";
  }

  private extractProductId(deviceId: string): string {
    const match = deviceId.match(/PID_([0-9A-F]{4})/i);
    return match ? match[1].toLowerCase() : "unknown";
  }

  private async checkUSBSecurityPolicy(deviceId: string, usbDevice: any) {
    // Implementation would check against security_policies table
    // This is a placeholder for the enhanced USB security checking
  }

  // Track software installations from agent reports
  async trackSoftwareInstallations(deviceId: string, installedSoftware: any[]) {
    try {
      for (const software of installedSoftware) {
        await db.execute(sql`
          INSERT INTO software_installations (device_id, software_name, version, vendor, install_date, last_seen)
          VALUES (${deviceId}, ${software.name}, ${software.version}, ${software.vendor}, 
                  ${software.install_date ? new Date(software.install_date) : null}, NOW())
          ON CONFLICT (device_id, software_name, version) 
          DO UPDATE SET last_seen = NOW(), vendor = EXCLUDED.vendor
        `);
      }

      // Check license compliance
      await this.checkLicenseCompliance(installedSoftware);

    } catch (error) {
      console.error("Error tracking software installations:", error);
    }
  }

  private async checkLicenseCompliance(installedSoftware: any[]) {
    // Implementation would check against license_compliance table
    // Update licenses_used counts and create alerts for over-license situations
  }

  // Store performance baselines and detect anomalies
  async updatePerformanceBaseline(deviceId: string, metricType: string, currentValue: number) {
    try {
      // Store baseline data
      await db.execute(sql`
        INSERT INTO performance_baselines (device_id, metric_type, baseline_value, variance_threshold)
        VALUES (${deviceId}, ${metricType}, ${currentValue}, ${this.getDefaultThreshold(metricType)})
        ON CONFLICT (device_id, metric_type) 
        DO UPDATE SET 
          baseline_value = (performance_baselines.baseline_value * 0.8 + ${currentValue} * 0.2),
          updated_at = NOW()
      `);

      // Check for anomalies
      await this.detectPerformanceAnomalies(deviceId, metricType, currentValue);

    } catch (error) {
      console.error("Error updating performance baseline:", error);
    }
  }

  private getDefaultThreshold(metricType: string): number {
    switch (metricType) {
      case "cpu": return 25;
      case "memory": return 20;
      case "disk": return 15;
      case "network": return 50;
      default: return 30;
    }
  }

  private async detectPerformanceAnomalies(deviceId: string, metricType: string, currentValue: number) {
    // Implementation would compare against baselines and create anomaly records
  }
}

export const enhancedStorage = new EnhancedStorage();