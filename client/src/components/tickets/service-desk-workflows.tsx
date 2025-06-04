
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardList, 
  AlertTriangle, 
  Search, 
  Settings,
  CheckCircle,
  Clock,
  User,
  ArrowRight
} from "lucide-react";

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
      { id: 1, name: "Problem Identification", description: "Pattern of incidents identified", status: "completed" },
      { id: 2, name: "Problem Logging", description: "Create problem record", status: "completed", assignee: "Problem Manager", timeframe: "2 hours" },
      { id: 3, name: "Investigation", description: "Deep dive root cause analysis", status: "active", assignee: "Technical Experts", timeframe: "1-2 weeks" },
      { id: 4, name: "Solution Design", description: "Design permanent solution", status: "pending", assignee: "Architecture Team", timeframe: "1 week" },
      { id: 5, name: "Change Request", description: "Submit RFC for permanent fix", status: "pending", assignee: "Change Manager", timeframe: "3 days" },
      { id: 6, name: "Implementation", description: "Deploy permanent solution", status: "pending", assignee: "Implementation Team" },
      { id: 7, name: "Verification", description: "Confirm problem resolved", status: "pending", assignee: "Problem Manager" }
    ]
  },
  {
    type: "change",
    title: "Change Management",
    description: "Controlled modifications to IT infrastructure",
    icon: <Settings className="w-5 h-5" />,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    steps: [
      { id: 1, name: "Change Request", description: "RFC submitted with details", status: "completed" },
      { id: 2, name: "Impact Assessment", description: "Assess risks and impact", status: "completed", assignee: "Change Analyst", timeframe: "1 day" },
      { id: 3, name: "CAB Review", description: "Change Advisory Board review", status: "active", assignee: "CAB Members", timeframe: "Weekly meeting" },
      { id: 4, name: "Authorization", description: "Change authority approval", status: "pending", assignee: "Change Manager", timeframe: "2 days" },
      { id: 5, name: "Implementation", description: "Execute change as planned", status: "pending", assignee: "Implementation Team", timeframe: "Scheduled" },
      { id: 6, name: "Review", description: "Post-implementation review", status: "pending", assignee: "Change Manager", timeframe: "1 week" }
    ]
  }
];

export default function ServiceDeskWorkflows() {
  const getStepIcon = (status: WorkflowStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "active":
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflowTemplates.map((workflow) => (
          <Card key={workflow.type} className="h-fit">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${workflow.color}`}>
                    {workflow.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{workflow.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {workflow.description}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={workflow.color}>
                  {workflow.steps.filter(s => s.status === "completed").length}/{workflow.steps.length}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {workflow.steps.map((step, index) => (
                  <div key={step.id} className="flex items-start space-x-3">
                    <div className="flex flex-col items-center">
                      {getStepIcon(step.status)}
                      {index < workflow.steps.length - 1 && (
                        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mt-2" />
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
                        </h4>
                        {step.timeframe && (
                          <span className="text-xs text-muted-foreground">
                            {step.timeframe}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.description}
                      </p>
                      
                      {step.assignee && (
                        <div className="flex items-center space-x-1 mt-1">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {step.assignee}
                          </span>
                        </div>
                      )}
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
