import { useState } from "react";
import { AgentFilters } from "@/components/agents/agent-filters";
import { AgentTable } from "@/components/agents/agent-table";
import { useAgents } from "@/hooks/use-agents";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Agents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: agents = [], isLoading, refetch } = useAgents();

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#201F1E] dark:text-[#F3F2F1] mb-2">Managed Systems</h1>
            <p className="text-neutral-600">Monitor and manage all registered agents</p>
          </div>
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
      <AgentTable agents={filteredAgents} isLoading={isLoading} />
    </div>
  );
}