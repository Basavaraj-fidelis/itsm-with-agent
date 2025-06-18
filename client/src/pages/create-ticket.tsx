
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Ticket,
  AlertTriangle,
  Wrench,
  RefreshCw,
  User,
  Calendar,
  Flag,
  FileText,
  Info,
  CheckCircle2,
  Clock,
  Shield,
  Settings
} from "lucide-react";

interface NewTicketFormData {
  type: string;
  title: string;
  description: string;
  priority: string;
  requester_email: string;
  category: string;
  impact?: string;
  urgency?: string;
  change_type?: string;
  risk_level?: string;
  known_error?: boolean;
  implementation_plan?: string;
  rollback_plan?: string;
  scheduled_start?: string;
}

const typeIcons = {
  request: Ticket,
  incident: AlertTriangle,
  problem: Wrench,
  change: RefreshCw,
};

const typeColors = {
  request: "from-green-50 to-green-100 border-green-200",
  incident: "from-red-50 to-red-100 border-red-200",
  problem: "from-orange-50 to-orange-100 border-orange-200",
  change: "from-blue-50 to-blue-100 border-blue-200",
};

const typeDescriptions = {
  request: "Software installations, hardware requests, access permissions, and general IT services",
  incident: "Service disruptions, system outages, and urgent technical issues requiring immediate attention",
  problem: "Root cause analysis for recurring incidents and known error documentation",
  change: "Infrastructure modifications, system updates, and planned maintenance activities"
};

export default function CreateTicket() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<NewTicketFormData>({
    type: "",
    title: "",
    description: "",
    priority: "medium",
    requester_email: "",
    category: "",
    impact: "medium",
    urgency: "medium",
    known_error: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.type) newErrors.type = "Please select a ticket type";
    }

    if (step === 2) {
      if (!formData.title.trim()) newErrors.title = "Title is required";
      if (!formData.description.trim()) newErrors.description = "Description is required";
      if (!formData.requester_email.trim()) newErrors.requester_email = "Requester email is required";
      if (formData.requester_email && !/\S+@\S+\.\S+/.test(formData.requester_email)) {
        newErrors.requester_email = "Please enter a valid email address";
      }
    }

    if (step === 3) {
      if (formData.type === "change" && !formData.change_type) {
        newErrors.change_type = "Change type is required for change requests";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      const response = await api.post("/api/tickets", formData);

      if (response.ok) {
        const newTicket = await response.json();
        toast({
          title: "Success",
          description: `Ticket ${newTicket.ticket_number} created successfully`,
        });
        setLocation("/tickets");
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to create ticket");
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              step < currentStep ? "bg-green-600 text-white" :
              step === currentStep ? "bg-blue-600 text-white" :
              "bg-gray-200 text-gray-600"
            }`}>
              {step < currentStep ? <CheckCircle2 className="w-5 h-5" /> : step}
            </div>
            {step < 3 && (
              <div className={`w-16 h-1 mx-2 ${
                step < currentStep ? "bg-green-600" : "bg-gray-200"
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center flex items-center justify-center">
          <Ticket className="w-6 h-6 mr-2 text-blue-600" />
          Select Ticket Type
        </CardTitle>
        <p className="text-center text-muted-foreground">
          Choose the type of request or issue you need assistance with
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(typeIcons).map(([type, IconComponent]) => (
            <Card
              key={type}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                formData.type === type 
                  ? `bg-gradient-to-br ${typeColors[type as keyof typeof typeColors]} border-current` 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => updateFormData("type", type)}
            >
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className={`mx-auto w-16 h-16 rounded-lg flex items-center justify-center ${
                    type === 'request' ? 'bg-green-100 text-green-600' :
                    type === 'incident' ? 'bg-red-100 text-red-600' :
                    type === 'problem' ? 'bg-orange-100 text-orange-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold capitalize mb-2">
                      {type === 'request' ? 'Service Request' : type}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {typeDescriptions[type as keyof typeof typeDescriptions]}
                    </p>
                  </div>
                  {formData.type === type && (
                    <Badge className="bg-blue-600 text-white">
                      Selected
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {errors.type && (
          <p className="text-red-600 text-sm mt-4 text-center">{errors.type}</p>
        )}
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center flex items-center justify-center">
          <FileText className="w-6 h-6 mr-2 text-blue-600" />
          Ticket Details
        </CardTitle>
        <p className="text-center text-muted-foreground">
          Provide detailed information about your {formData.type}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateFormData("title", e.target.value)}
              placeholder="Brief description of the issue or request"
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && <p className="text-red-600 text-xs">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="requester_email" className="text-sm font-medium">
              Requester Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="requester_email"
              type="email"
              value={formData.requester_email}
              onChange={(e) => updateFormData("requester_email", e.target.value)}
              placeholder="user@company.com"
              className={errors.requester_email ? "border-red-500" : ""}
            />
            {errors.requester_email && <p className="text-red-600 text-xs">{errors.requester_email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority" className="text-sm font-medium">
              Priority
            </Label>
            <Select value={formData.priority} onValueChange={(value) => updateFormData("priority", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center">
                    <Flag className="w-4 h-4 mr-2 text-blue-600" />
                    Low
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center">
                    <Flag className="w-4 h-4 mr-2 text-yellow-600" />
                    Medium
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center">
                    <Flag className="w-4 h-4 mr-2 text-orange-600" />
                    High
                  </div>
                </SelectItem>
                <SelectItem value="critical">
                  <div className="flex items-center">
                    <Flag className="w-4 h-4 mr-2 text-red-600" />
                    Critical
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category
            </Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => updateFormData("category", e.target.value)}
              placeholder="e.g., Hardware, Software, Network"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateFormData("description", e.target.value)}
            placeholder="Detailed description of the issue or request"
            rows={6}
            className={errors.description ? "border-red-500" : ""}
          />
          {errors.description && <p className="text-red-600 text-xs">{errors.description}</p>}
        </div>

        {/* Basic Impact/Urgency for all types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="impact" className="text-sm font-medium">
              Impact
            </Label>
            <Select value={formData.impact} onValueChange={(value) => updateFormData("impact", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select impact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="urgency" className="text-sm font-medium">
              Urgency
            </Label>
            <Select value={formData.urgency} onValueChange={(value) => updateFormData("urgency", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center flex items-center justify-center">
          <Settings className="w-6 h-6 mr-2 text-blue-600" />
          Additional Details
        </CardTitle>
        <p className="text-center text-muted-foreground">
          Provide type-specific information for your {formData.type}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Change Management Specific Fields */}
        {formData.type === "change" && (
          <div className="space-y-6 border border-blue-200 rounded-lg p-6 bg-blue-50/50">
            <h4 className="font-medium text-lg text-blue-900 flex items-center">
              <RefreshCw className="w-5 h-5 mr-2" />
              Change Management Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="change_type" className="text-sm font-medium">
                  Change Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.change_type}
                  onValueChange={(value) => updateFormData("change_type", value)}
                >
                  <SelectTrigger className={errors.change_type ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select change type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
                {errors.change_type && <p className="text-red-600 text-xs">{errors.change_type}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk_level" className="text-sm font-medium">
                  Risk Level
                </Label>
                <Select
                  value={formData.risk_level}
                  onValueChange={(value) => updateFormData("risk_level", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_start" className="text-sm font-medium">
                  Scheduled Start
                </Label>
                <Input
                  id="scheduled_start"
                  type="datetime-local"
                  value={formData.scheduled_start}
                  onChange={(e) => updateFormData("scheduled_start", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="implementation_plan" className="text-sm font-medium">
                  Implementation Plan
                </Label>
                <Textarea
                  id="implementation_plan"
                  value={formData.implementation_plan}
                  onChange={(e) => updateFormData("implementation_plan", e.target.value)}
                  placeholder="Detailed steps for implementing the change"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rollback_plan" className="text-sm font-medium">
                  Rollback Plan
                </Label>
                <Textarea
                  id="rollback_plan"
                  value={formData.rollback_plan}
                  onChange={(e) => updateFormData("rollback_plan", e.target.value)}
                  placeholder="Steps to rollback if the change fails"
                  rows={4}
                />
              </div>
            </div>
          </div>
        )}

        {/* Problem Management Specific Fields */}
        {formData.type === "problem" && (
          <div className="space-y-6 border border-orange-200 rounded-lg p-6 bg-orange-50/50">
            <h4 className="font-medium text-lg text-orange-900 flex items-center">
              <Wrench className="w-5 h-5 mr-2" />
              Problem Management Details
            </h4>
            <div className="space-y-2">
              <Label htmlFor="known_error" className="text-sm font-medium">
                Known Error
              </Label>
              <Select
                value={formData.known_error ? "true" : "false"}
                onValueChange={(value) => updateFormData("known_error", value === "true")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Is this a known error?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">No</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Show a message for request and incident types */}
        {(formData.type === "request" || formData.type === "incident") && (
          <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-2">Ready to Submit</h4>
            <p className="text-sm text-gray-600">
              All required information has been provided for this {formData.type}.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/tickets')}
            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tickets
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Create New Ticket
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Step {currentStep} of 3
            </p>
          </div>
          <div className="w-32"> {/* Spacer for centering */}
          </div>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div className="mb-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="min-w-24"
          >
            Previous
          </Button>

          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={() => setLocation('/tickets')}
            >
              Cancel
            </Button>
            
            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!formData.type && currentStep === 1}
                className="min-w-24"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="min-w-32 bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Create Ticket
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
