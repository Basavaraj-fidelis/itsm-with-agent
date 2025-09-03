import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentErrorBoundary, SafeDataRenderer } from "@/components/ui/agent-error-boundary";
import { useProcessedAgentData } from "@/lib/agent-data-processor";
import type { Agent } from "@/types/agent-types";
import { Activity, Brain, Cpu, Network, HardDrive, Package, Download } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { AIInsights } from "./ai-insights";
import { AgentDataProcessor } from "@/lib/agent-data-processor";
import { OverviewTab } from "./overview-tab";
import { HardwareTab } from "./hardware-tab";
import { NetworkTab } from "./network-tab";
import { StorageTab } from "./storage-tab";
import { ProcessesTab } from "./processes-tab";
import { SoftwareTab } from "./software-tab";
import { UpdatesTab } from "./updates-tab";

interface AgentTabsProps {
  agent: Agent;
  processedData?: any;
}

export default function AgentTabs({ agent, processedData }: AgentTabsProps) {
  const [usbHistory, setUsbHistory] = useState([]);

  useEffect(() => {
    const fetchUSBHistory = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`/api/devices/${agent.id}/usb-devices`, {
          headers: token
            ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
            : { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          setUsbHistory(data);
        } else if (response.status === 403) {
          console.warn("Access forbidden for USB devices endpoint");
        } else {
          console.error("Failed to fetch USB devices:", response.status, response.statusText);
        }
      } catch (error) {
        console.error("Error fetching USB history:", error);
      }
    };

    if (agent.id) {
      fetchUSBHistory();
    }
  }, [agent.id]);

  if (!processedData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-gray-600">Processing agent data...</p>
          {agent?.latest_report?.raw_data && (
            <p className="text-xs text-gray-500 mt-2">
              Raw data available: {typeof agent.latest_report.raw_data}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Extract data with safe fallbacks
  const extractDataSafely = useMemo(() => {
    try {
      if (!agent?.latest_report?.raw_data) {
        console.log("No raw_data available for agent:", agent?.hostname);
        return {
          systemInfo: {},
          networkInfo: {},
          hardwareInfo: {},
          usbDevices: [],
          processes: [],
          software: [],
          storage: [],
        };
      }

      const rawData = typeof agent.latest_report.raw_data === "string"
        ? JSON.parse(agent.latest_report.raw_data)
        : agent.latest_report.raw_data;

      return {
        systemInfo: AgentDataProcessor.extractSystemInfo(agent, rawData),
        networkInfo: AgentDataProcessor.extractNetworkInfo(agent, rawData),
        hardwareInfo: AgentDataProcessor.extractHardwareInfo(rawData),
        usbDevices: (AgentDataProcessor.extractUSBDevices(rawData) || []).filter(Boolean),
        processes: (AgentDataProcessor.extractProcesses(rawData) || []).filter(Boolean),
        software: (AgentDataProcessor.extractSoftware(rawData) || []).filter(Boolean),
        storage: (AgentDataProcessor.extractStorage(rawData) || []).filter(Boolean),
      };
    } catch (error) {
      console.error("Error extracting agent data:", error);
      return {
        systemInfo: {},
        networkInfo: {},
        hardwareInfo: {},
        usbDevices: [],
        processes: [],
        software: [],
        storage: [],
      };
    }
  }, [agent]);

  const {
    systemInfo = {},
    networkInfo = {},
    hardwareInfo = {},
    usbDevices = [],
    processes = [],
    software = [],
    storage = [],
  } = extractDataSafely || {};

  const metrics = processedData?.metrics || {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkIO: 0,
  };

  const windowsUpdates = processedData?.windows_updates || null;

  return (
    <AgentErrorBoundary>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-8 text-xs gap-1">
          <TabsTrigger value="overview" className="flex items-center space-x-1 text-xs px-2 py-1">
            <Activity className="w-3 h-3" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="ai-insights" className="flex items-center space-x-1 text-xs px-2 py-1">
            <Brain className="w-3 h-3" />
            <span className="hidden sm:inline">AI</span>
          </TabsTrigger>
          <TabsTrigger value="hardware" className="flex items-center space-x-1 text-xs px-2 py-1">
            <Cpu className="w-3 h-3" />
            <span className="hidden sm:inline">Hardware</span>
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center space-x-1 text-xs px-2 py-1">
            <Network className="w-3 h-3" />
            <span className="hidden sm:inline">Network</span>
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center space-x-1 text-xs px-2 py-1">
            <HardDrive className="w-3 h-3" />
            <span className="hidden sm:inline">Storage</span>
          </TabsTrigger>
          <TabsTrigger value="processes" className="flex items-center space-x-1 text-xs px-2 py-1">
            <Activity className="w-3 h-3" />
            <span className="hidden sm:inline">Processes</span>
          </TabsTrigger>
          <TabsTrigger value="software" className="flex items-center space-x-1 text-xs px-2 py-1">
            <Package className="w-3 h-3" />
            <span className="hidden sm:inline">Software</span>
          </TabsTrigger>
          <TabsTrigger value="updates" className="flex items-center space-x-1 text-xs px-2 py-1">
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Updates</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-insights" className="space-y-6">
          <SafeDataRenderer>
            <AIInsights agent={agent} />
          </SafeDataRenderer>
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <SafeDataRenderer>
            <OverviewTab 
              agent={agent} 
              systemInfo={systemInfo} 
              networkInfo={networkInfo} 
              metrics={metrics} 
              storage={storage} 
              processes={processes} 
            />
          </SafeDataRenderer>
        </TabsContent>

        <TabsContent value="hardware" className="space-y-6">
          <SafeDataRenderer>
            <HardwareTab 
              agent={agent} 
              hardwareInfo={hardwareInfo} 
              systemInfo={systemInfo} 
              networkInfo={networkInfo} 
              extractedUsbDevices={usbDevices} 
              storage={storage} 
              metrics={metrics} 
            />
          </SafeDataRenderer>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <SafeDataRenderer>
            <NetworkTab agent={agent} />
          </SafeDataRenderer>
        </TabsContent>

        <TabsContent value="storage" className="space-y-6">
          <SafeDataRenderer>
            <StorageTab storage={storage} />
          </SafeDataRenderer>
        </TabsContent>

        <TabsContent value="processes" className="space-y-6">
          <SafeDataRenderer>
            <ProcessesTab processes={processes} />
          </SafeDataRenderer>
        </TabsContent>

        <TabsContent value="software" className="space-y-6">
          <SafeDataRenderer>
            <SoftwareTab software={software} />
          </SafeDataRenderer>
        </TabsContent>

        <TabsContent value="updates" className="space-y-6">
          <SafeDataRenderer>
            <UpdatesTab agent={agent} windowsUpdates={windowsUpdates} />
          </SafeDataRenderer>
        </TabsContent>
      </Tabs>
    </AgentErrorBoundary>
  );
}