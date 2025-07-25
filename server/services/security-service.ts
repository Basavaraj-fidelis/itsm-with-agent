import { storage } from "../storage";

export interface USBPolicyRule {
  id: string;
  name: string;
  allowed_vendor_ids: string[];
  blocked_vendor_ids: string[];
  allowed_device_types: string[];
  blocked_device_types: string[];
  require_approval: boolean;
  is_active: boolean;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  type: "usb_policy" | "software_whitelist" | "patch_policy";
  rules: any;
  enforcement_level: "warn" | "block" | "audit";
  is_active: boolean;
}

export interface VulnerabilityCheck {
  software_name: string;
  version: string;
  cve_matches: Array<{
    cve_id: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    patch_available: boolean;
  }>;
}

class SecurityService {
  private usbPolicies: USBPolicyRule[] = [
    {
      id: "default-usb-policy",
      name: "Default USB Security Policy",
      allowed_vendor_ids: ["046d", "413c", "045e", "0408"], // Logitech, Dell, Microsoft, USB Composite Device
      blocked_vendor_ids: ["1234", "5678"], // Known malicious vendors
      allowed_device_types: ["keyboard", "mouse", "webcam", "composite"],
      blocked_device_types: ["mass_storage", "wireless_adapter"],
      require_approval: false,
      is_active: true,
    },
  ];

  async checkUSBCompliance(deviceId: string, usbDevices: any[]): Promise<void> {
    const activePolicy = this.usbPolicies.find((p) => p.is_active);
    if (!activePolicy) return;

    for (const device of usbDevices) {
      const vendorId = this.extractVendorId(
        device.device_id || device.id || "",
      );
      const deviceType = this.categorizeUSBDevice(
        device.description || device.name || "",
      );

      let isViolation = false;
      let violationReason = "";

      // Check blocked vendors
      if (activePolicy.blocked_vendor_ids.includes(vendorId)) {
        isViolation = true;
        violationReason = `Blocked vendor: ${vendorId}`;
      }

      // Check blocked device types
      if (activePolicy.blocked_device_types.includes(deviceType)) {
        isViolation = true;
        violationReason = `Blocked device type: ${deviceType}`;
      }

      // Check if device requires approval
      if (
        activePolicy.require_approval &&
        !activePolicy.allowed_vendor_ids.includes(vendorId)
      ) {
        isViolation = true;
        violationReason = `Unauthorized device requires approval`;
      }

      if (isViolation) {
        await storage.createAlert({
          device_id: deviceId,
          category: "security",
          severity: "high",
          message: `USB Security Policy Violation: ${device.description}`,
          metadata: {
            usb_device: device,
            vendor_id: vendorId,
            device_type: deviceType,
            violation_reason: violationReason,
            policy_name: activePolicy.name,
          },
          is_active: true,
        });
      }
    }
  }

  private extractVendorId(deviceId: string): string {
    const match = deviceId.match(/VID_([0-9A-F]{4})/i);
    return match ? match[1].toLowerCase() : "unknown";
  }

  private categorizeUSBDevice(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes("mass storage") || desc.includes("storage"))
      return "mass_storage";
    if (desc.includes("keyboard")) return "keyboard";
    if (desc.includes("mouse")) return "mouse";
    if (desc.includes("webcam") || desc.includes("camera")) return "webcam";
    if (desc.includes("wireless") || desc.includes("wifi"))
      return "wireless_adapter";
    if (desc.includes("audio") || desc.includes("speaker")) return "audio";
    if (desc.includes("composite")) return "composite";
    return "unknown";
  }

  async checkSoftwareLicenseCompliance(
    deviceId: string,
    installedSoftware: any[],
  ): Promise<void> {
    // Check against known licensed software database
    const licensedSoftware = await this.getLicensedSoftwareList();

    for (const software of installedSoftware) {
      const licenseInfo = licensedSoftware.find((ls) =>
        software.name?.toLowerCase().includes(ls.name.toLowerCase()),
      );

      if (licenseInfo) {
        if (licenseInfo.licenses_available <= licenseInfo.licenses_used) {
          await storage.createAlert({
            device_id: deviceId,
            category: "compliance",
            severity: "medium",
            message: `License compliance issue: ${software.name}`,
            metadata: {
              software: software,
              license_info: licenseInfo,
              violation_type: "license_exceeded",
            },
            is_active: true,
          });
        }
      }
    }
  }

  async checkVulnerabilities(
    deviceId: string,
    installedSoftware: any[],
  ): Promise<VulnerabilityCheck[]> {
    try {
      console.log(
        `Checking vulnerabilities for device ${deviceId} with ${installedSoftware.length} software packages`,
      );

      if (!installedSoftware || installedSoftware.length === 0) {
        console.log("No software packages to check for vulnerabilities");
        return [];
      }

      const vulnerabilities: VulnerabilityCheck[] = [];

      // Simulated CVE database - in production, integrate with NIST NVD API
      const knownVulnerabilities = [
        {
          software_pattern: "chrome",
          version_pattern: /^1[0-3][0-9]/,
          cve_id: "CVE-2024-0001",
          severity: "high" as const,
          description: "Remote code execution vulnerability",
          patch_available: true,
        },
        {
          software_pattern: "firefox",
          version_pattern: /^[1-9][0-9]/,
          cve_id: "CVE-2024-0002",
          severity: "medium" as const,
          description: "Cross-site scripting vulnerability",
          patch_available: true,
        },
      ];

      for (const software of installedSoftware) {
        const softwareName = software.name?.toLowerCase() || "";
        const version = software.version || "";

        const matchingVulns = knownVulnerabilities.filter(
          (vuln) =>
            softwareName.includes(vuln.software_pattern) &&
            vuln.version_pattern.test(version),
        );

        if (matchingVulns.length > 0) {
          vulnerabilities.push({
            software_name: software.name,
            version: version,
            cve_matches: matchingVulns.map((v) => ({
              cve_id: v.cve_id,
              severity: v.severity,
              description: v.description,
              patch_available: v.patch_available,
            })),
          });

          // Create alert for high/critical vulnerabilities
          const criticalVulns = matchingVulns.filter(
            (v) => v.severity === "high" || v.severity === "critical",
          );

          if (criticalVulns.length > 0) {
            await storage.createAlert({
              device_id: deviceId,
              category: "security",
              severity: criticalVulns.some((v) => v.severity === "critical")
                ? "critical"
                : "high",
              message: `Security vulnerability detected in ${software.name}`,
              metadata: {
                software: software,
                vulnerabilities: criticalVulns,
                patch_available: criticalVulns.some((v) => v.patch_available),
              },
              is_active: true,
            });
          }
        }
      }

      console.log(`Found ${vulnerabilities.length} vulnerable packages`);
      return vulnerabilities;
    } catch (error) {
      console.error("Error in checkVulnerabilities:", error);
      return [];
    }
  }

  private async getLicensedSoftwareList() {
    // This would typically come from a database
    return [
      {
        name: "Microsoft Office",
        licenses_purchased: 100,
        licenses_used: 85,
        licenses_available: 15,
        cost_per_license: 149.99,
      },
      {
        name: "Adobe Acrobat",
        licenses_purchased: 50,
        licenses_used: 52,
        licenses_available: -2,
        cost_per_license: 179.88,
      },
    ];
  }
}

export const securityService = new SecurityService();
