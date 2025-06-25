
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
