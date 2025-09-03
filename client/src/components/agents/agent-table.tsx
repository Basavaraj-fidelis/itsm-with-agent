import React from 'react';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Monitor, Wifi, WifiOff, AlertTriangle, CheckCircle, Search, Filter, MoreVertical, Eye, Settings, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LoadingSpinner, EmptyState, ErrorState } from '@/components/ui/loading-states';
import { DataTable, Column } from '@/components/ui/data-table';

interface AgentTableProps {
  agents: any[];
  loading?: boolean;
  error?: string;
  onAgentClick?: (agent: any) => void;
  onAgentDelete?: (agent: any) => void;
  onAgentEdit?: (agent: any) => void;
  onRefresh?: () => void;
  selectedAgents?: any[];
  onSelectionChange?: (agents: any[]) => void;
}

export const AgentTable: React.FC<AgentTableProps> = ({ 
  agents, 
  loading = false, 
  error,
  onAgentClick, 
  onAgentDelete,
  onAgentEdit,
  onRefresh,
  selectedAgents = [],
  onSelectionChange
}) => {
  // Debug logging for agent data
  React.useEffect(() => {
    if (agents?.length > 0) {
      console.log('Agent Table Debug - Sample agent data:', {
        sampleAgent: agents[0],
        latestReport: agents[0]?.latest_report,
        rawDataExists: !!agents[0]?.latest_report?.raw_data,
        cpuUsage: agents[0]?.latest_report?.cpu_usage,
        memoryUsage: agents[0]?.latest_report?.memory_usage,
        diskUsage: agents[0]?.latest_report?.disk_usage
      });
    }
  }, [agents]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteAgent, setDeleteAgent] = useState<any>(null);

  const getStatusBadge = (agent: any) => {
    let status = 'offline'; // Default to offline
    
    // Get the most recent timestamp from either last_seen or latest_report
    const lastSeen = agent?.last_seen ? new Date(agent.last_seen) : null;
    const latestReport = agent?.latest_report?.collected_at ? new Date(agent.latest_report.collected_at) : null;
    const mostRecentTime = lastSeen && latestReport ? 
      (lastSeen > latestReport ? lastSeen : latestReport) : 
      (lastSeen || latestReport);
    
    if (mostRecentTime) {
      const now = new Date();
      const timeDifference = now.getTime() - mostRecentTime.getTime();
      const minutesDifference = timeDifference / (1000 * 60);

      // Use consistent 5-minute threshold like in agent detail
      if (minutesDifference < 5) {
        status = 'online';
      } else if (minutesDifference <= 60) {
        status = 'warning';
      } else {
        status = 'offline';
      }
    }

    const statusConfig = {
      online: { variant: 'default' as const, icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-200' },
      offline: { variant: 'secondary' as const, icon: WifiOff, className: 'bg-red-100 text-red-800 border-red-200' },
      warning: { variant: 'outline' as const, icon: AlertTriangle, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <IconComponent className="h-3 w-3 mr-1" />
        {status || 'Unknown'}
      </Badge>
    );
  };

  const handleDeleteConfirm = () => {
    if (deleteAgent && onAgentDelete) {
      onAgentDelete(deleteAgent);
      setDeleteAgent(null);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Agent Name',
      sortable: true,
      filterable: true,
      render: (value, agent) => {
        // Extract proper hostname and active IP
        let hostname = agent.hostname || value || 'Unknown';
        let activeIP = 'No IP';

        // Get hostname from raw data if available
        if (agent.latest_report?.raw_data) {
          try {
            const rawData = typeof agent.latest_report.raw_data === 'string' 
              ? JSON.parse(agent.latest_report.raw_data) 
              : agent.latest_report.raw_data;

            // Get hostname from raw data
            if (rawData.hostname || rawData.computer_name) {
              hostname = rawData.hostname || rawData.computer_name;
            }
          } catch (e) {
            // Use fallback values
          }
        }

        // Use the active IP from the device record (already processed by backend)
        activeIP = agent.ip_address || 'No IP';

        return (
          <div className="flex items-center space-x-3">
            <Monitor className="h-5 w-5 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {hostname}
              </div>
              <div className="text-sm text-gray-500">
                {activeIP}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value, agent) => getStatusBadge(agent),
    },
    {
      key: 'last_seen',
      header: 'Last Seen',
      sortable: true,
      render: (value) => value ? format(new Date(value), 'MMM dd, yyyy HH:mm') : 'Never'
    },
    {
      key: 'cpu_usage',
      header: 'CPU',
      sortable: true,
      render: (value, agent) => {
        // Extract CPU from multiple possible sources with proper field names
        let cpuValue = 0;

        // First check direct fields
        if (agent.latest_report?.cpu_usage && parseFloat(agent.latest_report.cpu_usage) > 0) {
          cpuValue = parseFloat(agent.latest_report.cpu_usage);
        } else if (agent.latest_report?.raw_data) {
          try {
            const rawData = typeof agent.latest_report.raw_data === 'string' 
              ? JSON.parse(agent.latest_report.raw_data) 
              : agent.latest_report.raw_data;

            // Try multiple extraction paths
            cpuValue = rawData?.hardware?.cpu?.usage_percent || 
                      rawData?.system_health?.cpu_usage ||
                      rawData?.cpu_usage || 
                      parseFloat(agent.latest_report?.cpu_usage || '0');
          } catch (e) {
            cpuValue = parseFloat(agent.latest_report?.cpu_usage || '0');
          }
        }

        return `${Math.max(0, Math.min(100, parseFloat(cpuValue))).toFixed(1)}%`;
      }
    },
    {
      key: 'memory_usage',
      header: 'Memory',
      sortable: true,
      render: (value, agent) => {
        // Extract Memory from multiple possible sources with proper field names
        let memoryValue = 0;

        // First check direct fields
        if (agent.latest_report?.memory_usage && parseFloat(agent.latest_report.memory_usage) > 0) {
          memoryValue = parseFloat(agent.latest_report.memory_usage);
        } else if (agent.latest_report?.raw_data) {
          try {
            const rawData = typeof agent.latest_report.raw_data === 'string' 
              ? JSON.parse(agent.latest_report.raw_data) 
              : agent.latest_report.raw_data;

            // Try multiple extraction paths
            memoryValue = rawData?.hardware?.memory?.percentage || 
                         rawData?.system_health?.memory_usage ||
                         rawData?.memory_usage || 
                         parseFloat(agent.latest_report?.memory_usage || '0');
          } catch (e) {
            memoryValue = parseFloat(agent.latest_report?.memory_usage || '0');
          }
        }

        return `${Math.max(0, Math.min(100, parseFloat(memoryValue))).toFixed(1)}%`;
      }
    },
    {
      key: 'disk_usage',
      header: 'Disk',
      sortable: true,
      render: (value, agent) => {
        // Extract Disk from multiple possible sources with proper field names
        let diskValue = 0;

        // First check direct fields
        if (agent.latest_report?.disk_usage && parseFloat(agent.latest_report.disk_usage) > 0) {
          diskValue = parseFloat(agent.latest_report.disk_usage);
        } else if (agent.latest_report?.raw_data) {
          try {
            const rawData = typeof agent.latest_report.raw_data === 'string' 
              ? JSON.JSON.parse(agent.latest_report.raw_data) 
              : agent.latest_report.raw_data;

            // Try to get from storage disks (primary disk usage)
            if (rawData?.storage?.disks && Array.isArray(rawData.storage.disks)) {
              const primaryDisk = rawData.storage.disks.find(disk => 
                disk.device === 'C:\\' || disk.mountpoint === 'C:\\'
              ) || rawData.storage.disks[0];

              if (primaryDisk?.percent) {
                diskValue = parseFloat(primaryDisk.percent);
              }
            } else {
              // Try other sources
              diskValue = rawData?.system_health?.disk_usage ||
                         rawData?.disk_usage || 
                         parseFloat(agent.latest_report?.disk_usage || '0');
            }
          } catch (e) {
            diskValue = parseFloat(agent.latest_report?.disk_usage || '0');
          }
        }

        return `${Math.max(0, Math.min(100, parseFloat(diskValue))).toFixed(1)}%`;
      }
    }
  ];

  const renderActions = (agent: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onAgentClick?.(agent)}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </DropdownMenuItem>
        {onAgentEdit && (
          <DropdownMenuItem onClick={() => onAgentEdit(agent)}>
            <Settings className="h-4 w-4 mr-2" />
            Edit Agent
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {onAgentDelete && (
          <DropdownMenuItem 
            onClick={() => setDeleteAgent(agent)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Agent
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <ErrorState 
            title="Failed to load agents"
            message={error}
            onRetry={onRefresh}
          />
        </CardContent>
      </Card>
    );
  }

  if (!loading && agents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={<Monitor className="h-12 w-12" />}
            title="No agents found"
            description="No monitoring agents are currently registered. Deploy agents to start monitoring your systems."
            action={
              <Button onClick={onRefresh}>
                Refresh
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="h-5 w-5" />
              <span>System Agents ({agents.length})</span>
            </CardTitle>
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                disabled={loading}
              >
                {loading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={agents}
            columns={columns}
            loading={loading}
            searchable={true}
            filterable={true}
            pagination={true}
            pageSize={10}
            onRowClick={onAgentClick}
            selectable={!!onSelectionChange}
            onRowSelect={onSelectionChange}
            emptyMessage="No monitoring agents found. Deploy agents to start monitoring your systems."
            actions={renderActions}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAgent} onOpenChange={() => setDeleteAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the agent "{deleteAgent?.name}"? 
              This action cannot be undone and will stop monitoring for this system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};