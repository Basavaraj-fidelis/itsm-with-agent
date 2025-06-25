import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  User,
  AlertTriangle,
  Settings,
  Search,
  ClipboardList
} from "lucide-react";

interface WorkflowStep {
  id: number;
  name: string;
  status: "completed" | "active" | "pending";
  assignee?: string;
  timeframe?: string;
}

interface WorkflowManagerProps {
  ticket: any;
  onStatusChange: (newStatus: string, workflowStep: number, stageName: string) => void;
}

const WORKFLOW_DEFINITIONS = {
  request: [
    { id: 1, name: "Request Submitted", status: "new", assignee: "User" },
    { id: 2, name: "Initial Review", status: "assigned", assignee: "Service Desk", timeframe: "1 hour" },
    { id: 3, name: "Approval Process", status: "pending", assignee: "Manager", timeframe: "4 hours" },
    { id: 4, name: "Fulfillment", status: "in_progress", assignee: "IT Team", timeframe: "1-3 days" },
    { id: 5, name: "Verification", status: "pending", assignee: "User", timeframe: "1 day" },
    { id: 6, name: "Closure", status: "resolved", assignee: "Service Desk" }
  ],
  incident: [
    { id: 1, name: "Incident Reported", status: "new", assignee: "User" },
    { id: 2, name: "Initial Assessment", status: "assigned", assignee: "Service Desk", timeframe: "15 minutes" },
    { id: 3, name: "Investigation", status: "in_progress", assignee: "L2 Support", timeframe: "1 hour" },
    { id: 4, name: "Resolution", status: "in_progress", assignee: "Technical Team", timeframe: "2-4 hours" },
    { id: 5, name: "Verification", status: "pending", assignee: "Service Desk", timeframe: "30 minutes" },
    { id: 6, name: "Closure", status: "resolved", assignee: "Service Desk" }
  ],
  problem: [
    { id: 1, name: "Problem Detection", status: "new", assignee: "System/User" },
    { id: 2, name: "Problem Logging", status: "assigned", assignee: "Service Desk", timeframe: "30 minutes" },
    { id: 3, name: "Problem Categorization", status: "assigned", assignee: "Problem Manager", timeframe: "1 hour" },
    { id: 4, name: "Investigation & Diagnosis", status: "in_progress", assignee: "Problem Analyst Team", timeframe: "5-10 days" },
    { id: 5, name: "Workaround Implementation", status: "in_progress", assignee: "Technical Team", timeframe: "2-3 days" },
    { id: 6, name: "Known Error Creation", status: "pending", assignee: "Problem Manager", timeframe: "1 day" },
    { id: 7, name: "Resolution Planning", status: "pending", assignee: "Architecture Team", timeframe: "3-5 days" },
    { id: 8, name: "Change Initiation", status: "pending", assignee: "Problem Manager", timeframe: "1 day" },
    { id: 9, name: "Solution Implementation", status: "in_progress", assignee: "Implementation Team", timeframe: "As per Change" },
    { id: 10, name: "Problem Closure", status: "resolved", assignee: "Problem Manager", timeframe: "1 week post-fix" }
  ],
  change: [
    { id: 1, name: "Change Request Initiation", status: "new", assignee: "Requestor" },
    { id: 2, name: "Initial Filtering", status: "assigned", assignee: "Change Coordinator", timeframe: "4 hours" },
    { id: 3, name: "Change Assessment", status: "in_progress", assignee: "Change Analyst", timeframe: "1-2 days" },
    { id: 4, name: "Technical Review", status: "pending", assignee: "Technical Architects", timeframe: "2-3 days" },
    { id: 5, name: "CAB Evaluation", status: "pending", assignee: "CAB Members", timeframe: "Weekly CAB meeting" },
    { id: 6, name: "Change Authorization", status: "pending", assignee: "Change Manager/CAB Chair", timeframe: "1 day" },
    { id: 7, name: "Implementation Planning", status: "pending", assignee: "Implementation Team", timeframe: "3-5 days" },
    { id: 8, name: "Change Implementation", status: "in_progress", assignee: "Implementation Team", timeframe: "As scheduled" },
    { id: 9, name: "Post Implementation Review", status: "pending", assignee: "Change Manager", timeframe: "1-2 weeks post-implementation" },
    { id: 10, name: "Change Closure", status: "resolved", assignee: "Change Manager", timeframe: "1 week post-PIR" }
  ]
};

export default function WorkflowManager({ ticket, onStatusChange }: WorkflowManagerProps) {
  const workflow = WORKFLOW_DEFINITIONS[ticket.type as keyof typeof WORKFLOW_DEFINITIONS] || [];
  const currentStep = ticket.workflow_step || 1;

  const getStepIcon = (stepId: number, status: string) => {
    if (stepId < currentStep) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (stepId === currentStep) {
      return <Clock className="w-4 h-4 text-blue-600" />;
    } else {
      return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getWorkflowIcon = (type: string) => {
    switch (type) {
      case "request":
        return <ClipboardList className="w-5 h-5 text-blue-600" />;
      case "incident":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "problem":
        return <Search className="w-5 h-5 text-orange-600" />;
      case "change":
        return <Settings className="w-5 h-5 text-green-600" />;
      default:
        return <ClipboardList className="w-5 h-5" />;
    }
  };

  const canAdvanceToNext = () => {
    return currentStep < workflow.length && ticket.status !== "closed" && ticket.status !== "cancelled";
  };

  const handleAdvanceWorkflow = () => {
    if (canAdvanceToNext()) {
      const nextStep = workflow[currentStep];
      onStatusChange(nextStep.status, currentStep + 1, nextStep.name);
    }
  };

  const getWorkflowColor = (type: string) => {
    switch (type) {
      case "request":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "incident":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "problem":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "change":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getWorkflowColor(ticket.type)}`}>
              {getWorkflowIcon(ticket.type)}
            </div>
            <div>
              <CardTitle className="text-lg capitalize">{ticket.type} Workflow</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Step {currentStep} of {workflow.length} - {workflow[currentStep - 1]?.name}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={getWorkflowColor(ticket.type)}>
            {currentStep}/{workflow.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {workflow.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isActive = stepNumber === currentStep;
            const isPending = stepNumber > currentStep;

            return (
              <div key={step.id} className="flex items-start space-x-3">
                <div className="flex flex-col items-center">
                  {getStepIcon(stepNumber, step.status)}
                  {index < workflow.length - 1 && (
                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mt-2" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium ${
                      isCompleted ? "text-green-700 dark:text-green-300" :
                      isActive ? "text-blue-700 dark:text-blue-300" :
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

                  {step.assignee && (
                    <div className="flex items-center space-x-1 mt-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {step.assignee}
                      </span>
                    </div>
                  )}

                  {isActive && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        Current Step
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {canAdvanceToNext() && (
          <div className="mt-6 pt-4 border-t">
            <Button 
              onClick={handleAdvanceWorkflow}
              className="w-full"
              variant="default"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Advance to Next Step: {workflow[currentStep]?.name}
            </Button>
          </div>
        )}

        {(ticket.status === "closed" || ticket.status === "cancelled") && (
          <div className="mt-6 pt-4 border-t">
            <Badge variant="outline" className="w-full justify-center py-2">
              <CheckCircle className="w-4 h-4 mr-2" />
              Workflow Complete
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}