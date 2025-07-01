import { db, sql } from "../db";

interface CompliancePolicy {
  id: string;
  name: string;
  policy_type: string;
  max_days_missing: number;
  severity_levels: string[];
  auto_remediate: boolean;
}

export class PatchComplianceService {
  private readonly COMPLIANCE_THRESHOLDS = {
    CRITICAL_MAX_DAYS: 7,
    IMPORTANT_MAX_DAYS: 30,
    MODERATE_MAX_DAYS: 60,
    LOW_MAX_DAYS: 90,
    MINIMUM_COMPLIANCE_PERCENTAGE: 95,
  };

  async getDashboardData() {
    try {
      console.log("Starting getDashboardData...");

      // Check if patch tables exist with better error handling
      try {
        console.log("Checking if patch_definitions table exists...");
        const result = await db.execute(
          sql`SELECT 1 FROM patch_definitions LIMIT 1`,
        );
        console.log(
          "patch_definitions table exists, proceeding with real data",
        );
      } catch (tableError) {
        console.log("Patch compliance tables not found, returning mock data");
        console.log("Table error:", tableError?.message || "Unknown error");
        return this.getMockDashboardData();
      }

      // Get all online devices
      let devices;
      try {
        console.log("Fetching devices from database...");
        const devicesResult = await db.execute(sql`
          SELECT d.id, d.hostname, d.os_name, d.os_version, d.status, d.last_seen
          FROM devices d 
          WHERE d.status = 'online'
          ORDER BY d.last_seen DESC
          LIMIT 50
        `);
        devices = devicesResult.rows || [];
        console.log(`Found ${devices.length} online devices`);

        if (devices.length === 0) {
          console.log("No online devices found, checking all devices...");
          const allDevicesResult = await db.execute(sql`
            SELECT d.id, d.hostname, d.os_name, d.os_version, d.status, d.last_seen
            FROM devices d 
            ORDER BY d.last_seen DESC
            LIMIT 10
          `);
          devices = allDevicesResult.rows || [];
          console.log(`Found ${devices.length} total devices`);
        }
      } catch (deviceFetchError) {
        console.error("Error fetching devices:", deviceFetchError);
        console.log("Returning mock data due to device fetch error");
        return this.getMockDashboardData();
      }

      const deviceReports: any[] = [];

      // Get patch compliance for each device
      for (const device of devices) {
        try {
          console.log(
            `Processing patches for device ${device.id} (${device.hostname})`,
          );

          // Get patch statistics for this device using proper UUID comparison
          const deviceUuid =
            typeof device.id === "string" ? device.id : device.id.toString();
          console.log(`Querying patches for device UUID: ${deviceUuid}`);
          console.log(`Device UUID type: ${typeof deviceUuid}`);

          const patchStatusResult = await db.execute(sql`
            SELECT 
              COUNT(*) as total_patches,
              COUNT(CASE WHEN dps.status = 'installed' THEN 1 END) as installed_patches,
              COUNT(CASE WHEN dps.status = 'missing' AND COALESCE(pd.severity, 'moderate') = 'critical' THEN 1 END) as missing_critical,
              COUNT(CASE WHEN dps.status = 'missing' AND COALESCE(pd.severity, 'moderate') = 'important' THEN 1 END) as missing_important,
              COUNT(CASE WHEN dps.status = 'failed' THEN 1 END) as failed_patches,
              MAX(dps.last_scan_date) as last_scan
            FROM device_patch_status dps
            LEFT JOIN patch_definitions pd ON dps.patch_id = pd.patch_id
            WHERE dps.device_id = ${deviceUuid}::uuid
          `);

          const patchStats = patchStatusResult.rows[0] || {
            total_patches: 0,
            installed_patches: 0,
            missing_critical: 0,
            missing_important: 0,
            failed_patches: 0,
            last_scan: device.last_seen,
          };

          const totalPatches = Number(patchStats.total_patches) || 0;
          const installedPatches = Number(patchStats.installed_patches) || 0;

          const compliance_percentage =
            totalPatches > 0 ? (installedPatches / totalPatches) * 100 : 100;

          // Calculate risk score based on missing patches
          const missingCritical = Number(patchStats.missing_critical) || 0;
          const missingImportant = Number(patchStats.missing_important) || 0;
          const failedPatches = Number(patchStats.failed_patches) || 0;

          let risk_score = 0;
          if (missingCritical > 0) risk_score = 100;
          else if (missingImportant > 3) risk_score = 80;
          else if (missingImportant > 0) risk_score = 60;
          else if (failedPatches > 0) risk_score = 40;
          else risk_score = 20;

          deviceReports.push({
            device_id: device.id,
            hostname: device.hostname || "Unknown",
            os_name: device.os_name || "Unknown",
            os_version: device.os_version || "Unknown",
            total_patches: totalPatches,
            installed_patches: installedPatches,
            missing_critical: missingCritical,
            missing_important: Number(patchStats.missing_important) || 0,
            failed_patches: failedPatches,
            compliance_percentage: Number(compliance_percentage.toFixed(1)),
            risk_score: risk_score,
            last_scan:
              patchStats.last_scan ||
              device.last_seen ||
              new Date().toISOString(),
          });

          console.log(
            `Device ${device.hostname}: ${totalPatches} total, ${installedPatches} installed, ${compliance_percentage.toFixed(1)}% compliant`,
          );
        } catch (deviceError) {
          console.error(`Error processing device ${device.id}:`, deviceError);
          // Add a basic device report even if patch query fails
          deviceReports.push({
            device_id: device.id,
            hostname: device.hostname || "Unknown",
            os_name: device.os_name || "Unknown",
            os_version: device.os_version || "Unknown",
            total_patches: 0,
            installed_patches: 0,
            missing_critical: 0,
            missing_important: 0,
            failed_patches: 0,
            compliance_percentage: 100,
            risk_score: 0,
            last_scan: new Date().toISOString(),
          });
        }
      }

      // Calculate summary statistics
      const totalDevices = deviceReports.length;
      const compliantDevices = deviceReports.filter(
        (r) =>
          r.compliance_percentage >=
          this.COMPLIANCE_THRESHOLDS.MINIMUM_COMPLIANCE_PERCENTAGE,
      ).length;
      const devicesWithCriticalGaps = deviceReports.filter(
        (r) => r.missing_critical > 0,
      ).length;
      const averageCompliance =
        totalDevices > 0
          ? deviceReports.reduce(
              (sum, r) => sum + (r.compliance_percentage || 0),
              0,
            ) / totalDevices
          : 0;

      // Calculate risk distribution
      const highRiskDevices = deviceReports.filter(
        (r) => r.risk_score > 75,
      ).length;
      const mediumRiskDevices = deviceReports.filter(
        (r) => r.risk_score > 25 && r.risk_score <= 75,
      ).length;
      const lowRiskDevices = deviceReports.filter(
        (r) => r.risk_score <= 25,
      ).length;

      const result = {
        summary: {
          total_devices: totalDevices,
          compliant_devices: compliantDevices,
          compliance_rate:
            totalDevices > 0
              ? Number(((compliantDevices / totalDevices) * 100).toFixed(1))
              : 0,
          devices_with_critical_gaps: devicesWithCriticalGaps,
          average_compliance: Number(averageCompliance.toFixed(1)),
        },
        devices: deviceReports,
        top_non_compliant: deviceReports
          .filter((r) => r.compliance_percentage < 90)
          .sort((a, b) => a.compliance_percentage - b.compliance_percentage)
          .slice(0, 10),
        upcoming_maintenance: [],
        risk_distribution: {
          high_risk: highRiskDevices,
          medium_risk: mediumRiskDevices,
          low_risk: lowRiskDevices,
        },
        recommendations: this.generateRecommendations(deviceReports),
      };

      console.log("Successfully generated dashboard data:", {
        totalDevices,
        compliantDevices,
        averageCompliance: averageCompliance.toFixed(1),
      });

      return result;
    } catch (error) {
      console.error("Error fetching patch compliance dashboard:", error);
      console.error("Error stack:", error.stack);
      // Return mock data instead of throwing to prevent 500 errors
      console.log("Returning mock data due to error");
      return this.getMockDashboardData();
    }
  }

  async processPatchData(deviceId: string, patchData: any) {
    try {
      // Process Windows Update data if available
      if (patchData.windows_updates) {
        await this.processWindowsUpdates(deviceId, patchData.windows_updates);
      }

      // Process installed software for patch correlation
      if (patchData.installed_software) {
        await this.processSoftwarePatches(
          deviceId,
          patchData.installed_software,
        );
      }

      // Auto-deploy critical security patches
      await this.autoDeploySecurityPatches(deviceId);

      // Update last scan time
      const deviceUuid =
        typeof deviceId === "string" ? deviceId : deviceId.toString();
      await db.execute(sql`
        UPDATE devices 
        SET updated_at = NOW() 
        WHERE id = ${deviceUuid}::uuid
      `);

      console.log(`Processed patch data for device ${deviceId}`);
    } catch (error) {
      console.error("Error processing patch data:", error);
      throw error;
    }
  }

  async processAgentReport(deviceId: string, reportData: any) {
    try {
      // Process Windows Update data from agent reports
      if (reportData.windows_updates) {
        await this.processWindowsUpdates(deviceId, reportData.windows_updates);
      }

      // Process patches from os_info (legacy format)
      if (reportData.os_info && reportData.os_info.patches && Array.isArray(reportData.os_info.patches)) {
        console.log(`Processing ${reportData.os_info.patches.length} legacy patches for device ${deviceId}`);
        
        const windowsUpdates = {
          installed_updates: reportData.os_info.patches.map((patch: any) => {
            let installDate = "Unknown date";
            
            // Handle different date formats
            if (patch.installed_on) {
              if (patch.installed_on.DateTime) {
                installDate = patch.installed_on.DateTime;
              } else if (patch.installed_on.value) {
                // Parse /Date(timestamp)/ format
                const timestamp = patch.installed_on.value.replace(/\/Date\((\d+)\)\//, "$1");
                installDate = new Date(parseInt(timestamp)).toLocaleDateString();
              } else if (typeof patch.installed_on === 'string') {
                installDate = patch.installed_on;
              }
            }
            
            return {
              title: `${patch.id}`,
              kb_article: patch.id,
              install_date: installDate,
              severity: 'moderate',
              category: 'windows_update'
            };
          }),
          available_updates: [],
          last_search_date: new Date().toISOString()
        };
        
        await this.processWindowsUpdates(deviceId, windowsUpdates);
        console.log(`Successfully processed ${windowsUpdates.installed_updates.length} legacy patches`);
      }

      console.log(`Processed agent report for device ${deviceId}`);
    } catch (error) {
      console.error("Error processing agent report:", error);
      throw error;
    }
  }

  private async processWindowsUpdates(deviceId: string, windowsUpdates: any) {
    const patches = windowsUpdates.available_updates || [];
    const installedUpdates = windowsUpdates.installed_updates || [];

    // Process available (missing) patches
    for (const patch of patches) {
      const category = this.categorizePatch(patch);
      await this.upsertPatchStatus(deviceId, {
        patch_id: patch.kb_article || patch.id || patch.title,
        status: "missing",
        title: patch.title,
        severity: this.mapSeverity(patch.importance || patch.severity),
        category: category,
        requires_reboot: patch.reboot_required || false,
      });
    }

    // Process installed patches
    for (const patch of installedUpdates) {
      const category = this.categorizePatch(patch);
      await this.upsertPatchStatus(deviceId, {
        patch_id: patch.kb_article || patch.id || patch.title,
        status: "installed",
        title: patch.title,
        severity: this.mapSeverity(patch.importance || patch.severity),
        category: category,
        install_date: patch.install_date
          ? new Date(patch.install_date)
          : new Date(),
        requires_reboot: patch.reboot_required || false,
      });
    }
  }

  private categorizePatch(patch: any): string {
    const title = (patch.title || "").toLowerCase();
    const category = (patch.category || "").toLowerCase();

    // Security-related keywords
    const securityKeywords = [
      "security",
      "vulnerability",
      "exploit",
      "malware",
      "defender",
      "firewall",
    ];
    const applicationKeywords = [
      "office",
      "outlook",
      "word",
      "excel",
      "powerpoint",
      "teams",
      "skype",
      "edge",
    ];

    // Check if it's a security patch
    if (
      securityKeywords.some(
        (keyword) => title.includes(keyword) || category.includes(keyword),
      )
    ) {
      return "security_update";
    }

    // Check if it's an application patch
    if (
      applicationKeywords.some(
        (keyword) => title.includes(keyword) || category.includes(keyword),
      )
    ) {
      return "application_update";
    }

    // Default Windows updates are considered security
    if (category.includes("windows") || title.includes("windows")) {
      return "security_update";
    }

    return patch.category || "windows_update";
  }

  private async processSoftwarePatches(
    deviceId: string,
    installedSoftware: any[],
  ) {
    // Correlate installed software with known vulnerabilities
    for (const software of installedSoftware) {
      if (software.version && software.name) {
        // Check for known vulnerabilities/patches for this software
        const vulnPatches = await this.getVulnerabilityPatches(software);

        for (const patch of vulnPatches) {
          await this.upsertPatchStatus(deviceId, {
            patch_id: patch.id,
            status: patch.is_installed ? "installed" : "missing",
            title: patch.title,
            severity: patch.severity,
            category: "security_update",
          });
        }
      }
    }
  }

  private async upsertPatchStatus(deviceId: string, patchInfo: any) {
    // First ensure patch definition exists
    await db.execute(sql`
      INSERT INTO patch_definitions (patch_id, title, severity, category, requires_reboot)
      VALUES (${patchInfo.patch_id}, ${patchInfo.title}, ${patchInfo.severity}, ${patchInfo.category}, ${patchInfo.requires_reboot || false})
      ON CONFLICT (patch_id) DO UPDATE SET
        title = EXCLUDED.title,
        severity = EXCLUDED.severity,
        category = EXCLUDED.category,
        updated_at = NOW()
    `);

    // Insert or update device patch status using proper UUID
    const deviceUuid =
      typeof deviceId === "string" ? deviceId : deviceId.toString();
    await db.execute(sql`
      INSERT INTO device_patch_status (device_id, patch_id, status, install_date, last_scan_date)
      VALUES (${deviceUuid}::uuid, ${patchInfo.patch_id}, ${patchInfo.status}, ${patchInfo.install_date || null}, NOW())
      ON CONFLICT (device_id, patch_id) DO UPDATE SET
        status = EXCLUDED.status,
        install_date = COALESCE(EXCLUDED.install_date, device_patch_status.install_date),
        last_scan_date = NOW(),
        updated_at = NOW()
    `);
  }

  private mapSeverity(importance: string): string {
    if (!importance) return "low";
    const lower = importance.toLowerCase();
    if (lower.includes("critical") || lower.includes("important"))
      return "critical";
    if (lower.includes("moderate") || lower.includes("recommended"))
      return "important";
    if (lower.includes("optional") || lower.includes("low")) return "low";
    return "moderate";
  }

  private async getVulnerabilityPatches(software: any): Promise<any[]> {
    // Mock implementation - in production, integrate with CVE databases
    return [];
  }

  private async autoDeploySecurityPatches(deviceId: string) {
    try {
      // Get critical security patches that are missing
      const deviceUuid =
        typeof deviceId === "string" ? deviceId : deviceId.toString();
      const criticalPatchesResult = await db.execute(sql`
        SELECT dps.patch_id, pd.title, pd.category, pd.severity
        FROM device_patch_status dps
        JOIN patch_definitions pd ON dps.patch_id = pd.patch_id
        WHERE dps.device_id = ${deviceUuid}::uuid
        AND dps.status = 'missing'
        AND pd.severity = 'critical'
        AND (pd.category LIKE '%security%' OR pd.category LIKE '%windows_update%')
        AND pd.category NOT LIKE '%application%'
      `);

      const criticalPatches = criticalPatchesResult.rows;

      if (criticalPatches.length > 0) {
        // Create automatic deployment for security patches
        const deploymentId = await this.createPatchDeployment({
          name: `Auto Security Patch - Device ${deviceId}`,
          description: `Automatic deployment of ${criticalPatches.length} critical security patches`,
          target_patches: criticalPatches.map((p) => p.patch_id),
          target_devices: [deviceId],
          schedule_type: "immediate",
          scheduled_date: new Date(),
          created_by: "system-auto",
        });

        // Mark patches as pending deployment
        for (const patch of criticalPatches) {
          await db.execute(sql`
            UPDATE device_patch_status 
            SET status = 'pending', 
                deployment_id = ${deploymentId},
                updated_at = NOW()
            WHERE device_id = ${deviceUuid}::uuid AND patch_id = ${patch.patch_id}
          `);
        }

        console.log(
          `Auto-deployed ${criticalPatches.length} security patches for device ${deviceId}`,
        );
      }
    } catch (error) {
      console.error("Error auto-deploying security patches:", error);
    }
  }

  private getMockDashboardData() {
    console.log("⚠️  RETURNING MOCK DATA - Database tables not accessible");

    return {
      summary: {
        total_devices: 0,
        compliant_devices: 0,
        compliance_rate: 0,
        devices_with_critical_gaps: 0,
        average_compliance: 0,
      },
      devices: [],
      top_non_compliant: [],
      upcoming_maintenance: [],
      risk_distribution: {
        high_risk: 0,
        medium_risk: 0,
        low_risk: 0,
      },
      recommendations: [
        "System is currently offline",
        "Please try again later",
      ],
      mock_mode: true,
      database_status: "disconnected",
    };
  }

  private generateRecommendations(deviceReports: any[]): string[] {
    const recommendations = [];

    const criticalDevices = deviceReports.filter((d) => d.missing_critical > 0);
    if (criticalDevices.length > 0) {
      recommendations.push(
        `${criticalDevices.length} devices have missing critical patches - review application patches manually`,
      );
    }

    const lowCompliance = deviceReports.filter(
      (d) => d.compliance_percentage < 80,
    );
    if (lowCompliance.length > 0) {
      recommendations.push(
        `${lowCompliance.length} devices below 80% compliance - security patches auto-deployed, review application updates`,
      );
    }

    const failedPatches = deviceReports.filter((d) => d.failed_patches > 0);
    if (failedPatches.length > 0) {
      recommendations.push(
        `${failedPatches.length} devices have failed patch installations - investigate and retry`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Security patches are automatically deployed - only application patches require manual approval",
      );
      recommendations.push(
        "All systems appear to be compliant - continue monitoring",
      );
    }

    return recommendations;
  }

  async createPatchDeployment(deployment: any) {
    const result = await db.execute(sql`
      INSERT INTO patch_deployments (name, description, target_patches, target_devices, schedule_type, scheduled_date, created_by)
      VALUES (${deployment.name}, ${deployment.description}, ${deployment.target_patches}, ${deployment.target_devices}, 
              ${deployment.schedule_type}, ${deployment.scheduled_date}, ${deployment.created_by})
      RETURNING id
    `);

    return result.rows[0].id;
  }

  async getPatchDeployments() {
    const result = await db.execute(sql`
      SELECT pd.*, u.name as created_by_name
      FROM patch_deployments pd
      LEFT JOIN users u ON pd.created_by::uuid = u.id
      ORDER BY pd.created_at DESC
    `);

    return result.rows;
  }

  async getPendingApplicationPatches() {
    try {
      const result = await db.execute(sql`
        SELECT 
          dps.device_id,
          d.hostname,
          dps.patch_id,
          pd.title,
          pd.severity,
          pd.category,
          pd.description,
          dps.last_scan_date
        FROM device_patch_status dps
        JOIN patch_definitions pd ON dps.patch_id = pd.patch_id
        JOIN devices d ON dps.device_id = d.id
        WHERE dps.status = 'missing'
        AND pd.category LIKE '%application%'
        ORDER BY pd.severity DESC, dps.last_scan_date DESC
      `);

      return result.rows;
    } catch (error) {
      console.error("Error getting pending application patches:", error);
      throw error;
    }
  }
}

export const patchComplianceService = new PatchComplianceService();
