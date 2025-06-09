
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, XCircle, Wifi, Usb } from "lucide-react";
import { useAgents } from "@/hooks/use-agents";

export default function ComplianceDashboard() {
  const { data: agents = [], isLoading } = useAgents();

  const getComplianceStatus = () => {
    let firewallEnabled = 0;
    let antivirusEnabled = 0;
    let usbViolations = 0;
    let outdatedSystems = 0;

    agents.forEach(agent => {
      const report = agent.latest_report;
      if (!report) return;

      const rawData = typeof report.raw_data === 'string' 
        ? JSON.parse(report.raw_data) 
        : report.raw_data || {};

      // Firewall compliance
      if (rawData.security?.firewall_status === 'enabled') {
        firewallEnabled++;
      }

      // Antivirus compliance  
      if (rawData.security?.antivirus_status === 'enabled') {
        antivirusEnabled++;
      }

      // USB policy violations
      const usbDevices = rawData.extracted_usb_devices || [];
      if (usbDevices.length > 0) {
        const hasViolation = usbDevices.some(usb => 
          usb.description.includes('Mass Storage') ||
          usb.description.includes('Storage Device')
        );
        if (hasViolation) usbViolations++;
      }

      // OS update compliance
      const osInfo = rawData.os_info || {};
      const lastUpdate = osInfo.last_update;
      if (lastUpdate) {
        const updateDate = new Date(lastUpdate);
        const daysSinceUpdate = (Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 90) outdatedSystems++;
      }
    });

    return {
      firewallEnabled,
      antivirusEnabled,
      usbViolations,
      outdatedSystems,
      totalSystems: agents.length
    };
  };

  const compliance = getComplianceStatus();

  if (isLoading) return <div>Loading compliance data...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Security & Compliance Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor security posture and policy compliance across your fleet
        </p>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 text-green-500 mr-2" />
              Firewall Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {compliance.firewallEnabled}/{compliance.totalSystems}
              </div>
              <Badge variant={compliance.firewallEnabled === compliance.totalSystems ? "default" : "destructive"}>
                {Math.round((compliance.firewallEnabled / compliance.totalSystems) * 100)}%
              </Badge>
            </div>
            <p className="text-sm text-gray-600">Systems with firewall enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 text-blue-500 mr-2" />
              Antivirus Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {compliance.antivirusEnabled}/{compliance.totalSystems}
              </div>
              <Badge variant={compliance.antivirusEnabled === compliance.totalSystems ? "default" : "destructive"}>
                {Math.round((compliance.antivirusEnabled / compliance.totalSystems) * 100)}%
              </Badge>
            </div>
            <p className="text-sm text-gray-600">Systems with antivirus active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Usb className="w-5 h-5 text-orange-500 mr-2" />
              USB Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-orange-600">
                {compliance.usbViolations}
              </div>
              <Badge variant={compliance.usbViolations === 0 ? "default" : "secondary"}>
                {compliance.usbViolations === 0 ? "Clean" : "Violations"}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">Unauthorized storage devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              Update Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {compliance.totalSystems - compliance.outdatedSystems}/{compliance.totalSystems}
              </div>
              <Badge variant={compliance.outdatedSystems === 0 ? "default" : "destructive"}>
                {Math.round(((compliance.totalSystems - compliance.outdatedSystems) / compliance.totalSystems) * 100)}%
              </Badge>
            </div>
            <p className="text-sm text-gray-600">Systems with recent updates</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Compliance Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Compliance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">System</th>
                  <th className="text-left p-2">Firewall</th>
                  <th className="text-left p-2">Antivirus</th>
                  <th className="text-left p-2">USB Policy</th>
                  <th className="text-left p-2">Updates</th>
                  <th className="text-left p-2">Overall</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => {
                  const report = agent.latest_report;
                  const rawData = report ? 
                    (typeof report.raw_data === 'string' ? JSON.parse(report.raw_data) : report.raw_data || {}) 
                    : {};

                  const firewallOk = rawData.security?.firewall_status === 'enabled';
                  const antivirusOk = rawData.security?.antivirus_status === 'enabled';
                  const usbDevices = rawData.extracted_usb_devices || [];
                  const hasUsbViolation = usbDevices.some(usb => 
                    usb.description.includes('Mass Storage') ||
                    usb.description.includes('Storage Device')
                  );
                  
                  const lastUpdate = rawData.os_info?.last_update;
                  const updatesOk = lastUpdate ? 
                    (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24) <= 90 
                    : false;

                  const complianceScore = [firewallOk, antivirusOk, !hasUsbViolation, updatesOk]
                    .filter(Boolean).length;

                  return (
                    <tr key={agent.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{agent.hostname}</td>
                      <td className="p-2">
                        {firewallOk ? 
                          <CheckCircle className="w-4 h-4 text-green-500" /> :
                          <XCircle className="w-4 h-4 text-red-500" />
                        }
                      </td>
                      <td className="p-2">
                        {antivirusOk ? 
                          <CheckCircle className="w-4 h-4 text-green-500" /> :
                          <XCircle className="w-4 h-4 text-red-500" />
                        }
                      </td>
                      <td className="p-2">
                        {!hasUsbViolation ? 
                          <CheckCircle className="w-4 h-4 text-green-500" /> :
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        }
                      </td>
                      <td className="p-2">
                        {updatesOk ? 
                          <CheckCircle className="w-4 h-4 text-green-500" /> :
                          <XCircle className="w-4 h-4 text-red-500" />
                        }
                      </td>
                      <td className="p-2">
                        <Badge variant={complianceScore >= 3 ? "default" : complianceScore >= 2 ? "secondary" : "destructive"}>
                          {complianceScore}/4
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
