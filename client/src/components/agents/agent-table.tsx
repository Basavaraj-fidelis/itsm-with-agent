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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteAgent, setDeleteAgent] = useState<any>(null);

  const getStatusBadge = (status: string) => {
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
      render: (value, agent) => (
        <div className="flex items-center space-x-3">
          <Monitor className="h-5 w-5 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {value || 'Unknown'}
            </div>
            <div className="text-sm text-gray-500">
              {agent.ip_address || 'No IP'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => getStatusBadge(value)
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
        const cpuValue = value || agent.latest_report?.cpu_usage || 0;
        return `${parseFloat(cpuValue).toFixed(1)}%`;
      }
    },
    {
      key: 'memory_usage',
      header: 'Memory',
      sortable: true,
      render: (value, agent) => {
        const memoryValue = value || agent.latest_report?.memory_usage || 0;
        return `${parseFloat(memoryValue).toFixed(1)}%`;
      }
    },
    {
      key: 'disk_usage',
      header: 'Disk',
      sortable: true,
      render: (value, agent) => {
        const diskValue = value || agent.latest_report?.disk_usage || 0;
        return `${parseFloat(diskValue).toFixed(1)}%`;
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