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
            <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
              Agent Management
            </h1>
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
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface Agent {
  id: string
  hostname: string
  ip_address: string
  status: string
  os_type: string
  last_seen: string
}

export default function Agents() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ['agents', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      const response = await fetch(`/api/agents?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch agents')
      }
      return response.json()
    }
  })

  const filteredAgents = agents?.filter(agent =>
    agent.hostname.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!agents || agents.length === 0) {
    return <div>No agents found</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Agents</h1>
      
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search agents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32" aria-label="Status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} className="cursor-pointer hover:shadow-md">
            <CardHeader>
              <CardTitle>{agent.hostname}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-500">IP Address:</span>
                  <div>{agent.ip_address}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Status:</span>
                  <div>{agent.status}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">OS Type:</span>
                  <div>{agent.os_type}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
