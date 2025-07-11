
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ClipboardList, 
  AlertTriangle, 
  Search, 
  Settings,
  CheckCircle,
  Clock,
  User,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WorkflowStep {
  id: number;
  name: string;
  description: string;
  status: "pending" | "active" | "completed";
  assignee?: string;
  timeframe?: string;
}

interface ServiceDeskWorkflow {
  type: "service_request" | "incident" | "problem" | "change";
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  steps: WorkflowStep[];
}

const workflowTemplates: ServiceDeskWorkflow[] = [
  {
    type: "service_request",
    title: "Service Request",
    description: "Standard service requests like software installation, access requests, etc.",
    icon: <ClipboardList className="w-5 h-5" />,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    steps: [
      { id: 1, name: "Request Submitted", description: "User submits service request", status: "completed" },
      { id: 2, name: "Initial Review", description: "Service desk reviews request", status: "completed", assignee: "Service Desk", timeframe: "1 hour" },
      { id: 3, name: "Approval Process", description: "Manager approval if required", status: "active", assignee: "Manager", timeframe: "4 hours" },
      { id: 4, name: "Fulfillment", description: "IT team fulfills the request", status: "pending", assignee: "IT Team", timeframe: "1-3 days" },
      { id: 5, name: "Verification", description: "User confirms completion", status: "pending", assignee: "User", timeframe: "1 day" },
      { id: 6, name: "Closure", description: "Request closed", status: "pending", assignee: "Service Desk" }
    ]
  },
  {
    type: "incident",
    title: "Incident Management",
    description: "Unplanned service interruptions requiring immediate attention",
    icon: <AlertTriangle className="w-5 h-5" />,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    steps: [
      { id: 1, name: "Incident Reported", description: "Issue reported by user or monitoring", status: "completed" },
      { id: 2, name: "Initial Assessment", description: "Categorize and prioritize incident", status: "completed", assignee: "Service Desk", timeframe: "15 minutes" },
      { id: 3, name: "Investigation", description: "Technical team investigates root cause", status: "active", assignee: "L2 Support", timeframe: "1 hour" },
      { id: 4, name: "Resolution", description: "Implement fix or workaround", status: "pending", assignee: "Technical Team", timeframe: "2-4 hours" },
      { id: 5, name: "Verification", description: "Confirm service restored", status: "pending", assignee: "Service Desk", timeframe: "30 minutes" },
      { id: 6, name: "Closure", description: "Document resolution and close", status: "pending", assignee: "Service Desk" }
    ]
  },
  {
    type: "problem",
    title: "Problem Management",
    description: "Root cause analysis for recurring incidents",
    icon: <Search className="w-5 h-5" />,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    steps: [
      { id: 1, name: "Problem Detection", description: "Multiple related incidents detected", status: "completed" },
      { id: 2, name: "Problem Logging", description: "Problem record created with initial details", status: "completed", assignee: "Service Desk", timeframe: "30 minutes" },
      { id: 3, name: "Problem Categorization", description: "Categorize and prioritize problem", status: "completed", assignee: "Problem Manager", timeframe: "1 hour" },
      { id: 4, name: "Investigation & Diagnosis", description: "Root cause analysis and investigation", status: "active", assignee: "Problem Analyst Team", timeframe: "5-10 days" },
      { id: 5, name: "Workaround Implementation", description: "Implement temporary workaround if possible", status: "pending", assignee: "Technical Team", timeframe: "2-3 days" },
      { id: 6, name: "Known Error Creation", description: "Document as Known Error in KEDB", status: "pending", assignee: "Problem Manager", timeframe: "1 day" },
      { id: 7, name: "Resolution Planning", description: "Plan permanent resolution approach", status: "pending", assignee: "Architecture Team", timeframe: "3-5 days" },
      { id: 8, name: "Change Initiation", description: "Raise Change Request for permanent fix", status: "pending", assignee: "Problem Manager", timeframe: "1 day" },
      { id: 9, name: "Solution Implementation", description: "Implement permanent solution via Change", status: "pending", assignee: "Implementation Team", timeframe: "As per Change" },
      { id: 10, name: "Problem Closure", description: "Verify resolution and close problem", status: "pending", assignee: "Problem Manager", timeframe: "1 week post-fix" }
    ]
  },
  {
    type: "change",
    title: "Change Management",
    description: "Controlled modifications to IT infrastructure",
    icon: <Settings className="w-5 h-5" />,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    steps: [
      { id: 1, name: "Change Request Initiation", description: "RFC created with business justification", status: "completed" },
      { id: 2, name: "Initial Filtering", description: "Validate completeness and feasibility", status: "completed", assignee: "Change Coordinator", timeframe: "4 hours" },
      { id: 3, name: "Change Assessment", description: "Impact, risk, and resource assessment", status: "active", assignee: "Change Analyst", timeframe: "1-2 days" },
      { id: 4, name: "Technical Review", description: "Technical feasibility and design review", status: "pending", assignee: "Technical Architects", timeframe: "2-3 days" },
      { id: 5, name: "CAB Evaluation", description: "Change Advisory Board review and recommendation", status: "pending", assignee: "CAB Members", timeframe: "Weekly CAB meeting" },
      { id: 6, name: "Change Authorization", description: "Final approval from Change Authority", status: "pending", assignee: "Change Manager/CAB Chair", timeframe: "1 day" },
      { id: 7, name: "Implementation Planning", description: "Detailed implementation and rollback planning", status: "pending", assignee: "Implementation Team", timeframe: "3-5 days" },
      { id: 8, name: "Change Implementation", description: "Execute change according to plan", status: "pending", assignee: "Implementation Team", timeframe: "As scheduled" },
      { id: 9, name: "Post Implementation Review", description: "Verify success and document lessons learned", status: "pending", assignee: "Change Manager", timeframe: "1-2 weeks post-implementation" },
      { id: 10, name: "Change Closure", description: "Formal closure with success confirmation", status: "pending", assignee: "Change Manager", timeframe: "1 week post-PIR" }
    ]
  }
];

export default function ServiceDeskWorkflows() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [workflows, setWorkflows] = React.useState(workflowTemplates);
  const [liveTickets, setLiveTickets] = React.useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch active tickets for real-time workflow tracking
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['active-tickets'],
    queryFn: async () => {
      const response = await api.get('/tickets?status=new,assigned,in_progress,pending&limit=50');
      return response.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Connected to workflow updates WebSocket');
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'workflow-updates' }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ticket-update' || data.type === 'workflow-progress') {
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['active-tickets'] });
            
            // Update live workflow status
            setWorkflows(prevWorkflows => 
              prevWorkflows.map(workflow => 
                updateWorkflowWithLiveData(workflow, data.ticket)
              )
            );
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      return () => {
        ws.close();
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
    }
  }, [queryClient]);

  // Update workflows with live ticket data
  useEffect(() => {
    if (ticketsData?.data) {
      setLiveTickets(ticketsData.data);
      
      // Update workflows with real ticket progress
      setWorkflows(prevWorkflows => 
        prevWorkflows.map(workflow => {
          const relevantTickets = ticketsData.data.filter((ticket: any) => 
            ticket.type === workflow.type.replace('service_', '')
          );
          
          if (relevantTickets.length > 0) {
            return updateWorkflowWithTicketData(workflow, relevantTickets);
          }
          
          return workflow;
        })
      );
    }
  }, [ticketsData]);

  const updateWorkflowWithLiveData = (workflow: any, ticketData: any) => {
    if (ticketData.type !== workflow.type.replace('service_', '')) {
      return workflow;
    }

    const updatedSteps = workflow.steps.map((step: any) => {
      const isCurrentStep = step.status === ticketData.status;
      const isCompletedStep = getStepOrder(step.status) < getStepOrder(ticketData.status);
      
      return {
        ...step,
        status: isCompletedStep ? 'completed' : isCurrentStep ? 'active' : 'pending',
        assignee: isCurrentStep ? ticketData.assigned_to || step.assignee : step.assignee,
        actual_start_time: isCurrentStep || isCompletedStep ? ticketData.updated_at : undefined,
        duration_minutes: isCompletedStep ? calculateStepDuration(step, ticketData) : undefined
      };
    });

    return {
      ...workflow,
      steps: updatedSteps,
      activeTicketId: ticketData.id,
      ticketNumber: ticketData.ticket_number,
      lastUpdate: new Date().toISOString()
    };
  };

  const updateWorkflowWithTicketData = (workflow: any, tickets: any[]) => {
    // Use the most recent ticket for this workflow type
    const latestTicket = tickets.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];

    return updateWorkflowWithLiveData(workflow, latestTicket);
  };

  const getStepOrder = (status: string) => {
    const statusOrder = {
      'new': 1,
      'assigned': 2, 
      'pending': 3,
      'in_progress': 4,
      'resolved': 5,
      'closed': 6
    };
    return statusOrder[status as keyof typeof statusOrder] || 0;
  };

  const calculateStepDuration = (step: any, ticket: any) => {
    if (!step.actual_start_time) return undefined;
    
    const startTime = new Date(step.actual_start_time);
    const endTime = new Date(ticket.updated_at);
    const durationMs = endTime.getTime() - startTime.getTime();
    
    return Math.floor(durationMs / (1000 * 60)); // Convert to minutes
  };

  const handleRefreshWorkflows = () => {
    queryClient.invalidateQueries({ queryKey: ['active-tickets'] });
    setError(null);
  };

  // Add error boundary handling
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection in workflows:', event.reason);
      setError(`Workflow error: ${event.reason?.message || 'Unknown error'}`);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  const getStepIcon = (status: WorkflowStep["status"], isRealTime: boolean = false) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "active":
        return (
          <div className="relative">
            <Clock className="w-4 h-4 text-blue-600" />
            {isRealTime && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </div>
        );
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getWorkflowProgress = (workflow: any) => {
    const completedSteps = workflow.steps.filter((s: any) => s.status === "completed").length;
    const totalSteps = workflow.steps.length;
    const percentage = Math.round((completedSteps / totalSteps) * 100);
    
    return { completed: completedSteps, total: totalSteps, percentage };
  };

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={() => setError(null)}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Live Service Desk Workflows</h2>
          <p className="text-muted-foreground">Real-time workflow progress tracking</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshWorkflows}
            disabled={ticketsLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${ticketsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="secondary">
            {liveTickets.length} Active Tickets
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflows.map((workflow) => {
          const progress = getWorkflowProgress(workflow);
          const hasLiveData = workflow.activeTicketId;
          
          return (
            <Card key={workflow.type} className={`h-fit ${hasLiveData ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${workflow.color} relative`}>
                      {workflow.icon}
                      {hasLiveData && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        {workflow.title}
                        {hasLiveData && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Live
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {workflow.description}
                      </p>
                      {workflow.ticketNumber && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Tracking: {workflow.ticketNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={workflow.color}>
                      {progress.completed}/{progress.total}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {progress.percentage}% Complete
                    </div>
                    {workflow.lastUpdate && (
                      <div className="text-xs text-muted-foreground">
                        Updated: {new Date(workflow.lastUpdate).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {workflow.steps.map((step, index) => (
                  <div key={step.id} className="flex items-start space-x-3">
                    <div className="flex flex-col items-center">
                      {getStepIcon(step.status, hasLiveData)}
                      {index < workflow.steps.length - 1 && (
                        <div className={`w-px h-8 mt-2 ${
                          step.status === "completed" ? "bg-green-300" : "bg-gray-200 dark:bg-gray-700"
                        }`} />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium ${
                          step.status === "completed" ? "text-green-700 dark:text-green-300" :
                          step.status === "active" ? "text-blue-700 dark:text-blue-300" :
                          "text-gray-600 dark:text-gray-400"
                        }`}>
                          {step.name}
                          {step.status === "active" && hasLiveData && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              In Progress
                            </span>
                          )}
                        </h4>
                        <div className="text-right">
                          {step.timeframe && (
                            <span className="text-xs text-muted-foreground block">
                              Target: {step.timeframe}
                            </span>
                          )}
                          {step.duration_minutes && (
                            <span className="text-xs text-green-600 block">
                              Actual: {step.duration_minutes}m
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.description}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        {step.assignee && (
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {step.assignee}
                            </span>
                          </div>
                        )}
                        
                        {step.actual_start_time && (
                          <span className="text-xs text-muted-foreground">
                            Started: {new Date(step.actual_start_time).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
