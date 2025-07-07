import { useState } from "react";
import { AgentFilters } from "@/components/agents/agent-filters";
import { AgentTable } from "@/components/agents/agent-table";
import { useAgents } from "@/hooks/use-agents";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Download, FileText } from "lucide-react";

export default function Agents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: devices = [], isLoading, refetch } = useAgents();

  // Map devices to agent format and filter
  const agents = devices.map(device => ({
    ...device,
    name: device.hostname,
    ip_address: device.ip_address,
    last_seen: device.last_seen,
    cpu_usage: device.latest_report?.cpu_usage ? parseFloat(device.latest_report.cpu_usage) : 0,
    memory_usage: device.latest_report?.memory_usage ? parseFloat(device.latest_report.memory_usage) : 0,
    disk_usage: device.latest_report?.disk_usage ? parseFloat(device.latest_report.disk_usage) : 0
  }));

  // Filter agents based on search and filters
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.assigned_user?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;

    const matchesType = typeFilter === "all" || 
                       (typeFilter === "server" && agent.hostname.includes("SRV")) ||
                       (typeFilter === "workstation" && agent.hostname.includes("WS")) ||
                       (typeFilter === "laptop" && agent.hostname.includes("LAP"));

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
    refetch();
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const handleDownloadAgentsCSV = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter && typeFilter !== "all") params.append("type", typeFilter);
      if (searchTerm && searchTerm.trim()) params.append("search", searchTerm.trim());

      const response = await fetch(`/api/analytics/agents-csv?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "text/csv",
        },
      });

      if (response.ok) {
        const csvData = await response.text();
        const blob = new Blob([csvData], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `managed-systems-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log("CSV export completed successfully");
      } else {
        throw new Error("Failed to export CSV");
      }
    } catch (error) {
      console.error("Error exporting CSV:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDetailedReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter && typeFilter !== "all") params.append("type", typeFilter);
      if (searchTerm && searchTerm.trim()) params.append("search", searchTerm.trim());
      params.append("format", "xlsx");

      const response = await fetch(`/api/analytics/agents-detailed-report?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `managed-systems-detailed-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log("Detailed report download completed successfully");
      } else {
        throw new Error("Failed to generate detailed report");
      }
    } catch (error) {
      console.error("Error downloading detailed report:", error);
    } finally {
      setLoading(false);
    }
  };

  const [loading, setLoading] = useState(false);


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#201F1E] dark:text-[#F3F2F1] mb-2">Managed Systems</h1>
            <p className="text-neutral-600">Monitor and manage all registered agents</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Clear Filters
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadAgentsCSV}
              disabled={loading || isLoading}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {loading ? "Exporting..." : "Export CSV"}
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadDetailedReport}
              disabled={loading || isLoading}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {loading ? "Generating..." : "Download XLSX Report"}
            </Button>

            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                // Redirect to settings agent tab
                window.location.href = '/settings?tab=agent';
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Agent
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <AgentFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
        onRefresh={handleRefresh}
      />

      {/* Agent Table */}
      <AgentTable 
        agents={filteredAgents} 
        loading={isLoading}
        onRefresh={handleRefresh}
        onAgentClick={(agent) => {
          window.location.href = `/agents/${agent.id}`;
        }}
      />
    </div>
  );
}