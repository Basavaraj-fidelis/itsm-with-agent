import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

  const [formData, setFormData] = useState<NewTicketFormData>({
    type: "incident", // Default to incident
    title: "",
    description: "",
    priority: "medium",
    requester_email: "",
    category: "",
    impact: "medium",
    urgency: "medium",
    known_error: false,
  });

  // Predefined categories based on ticket type
  const getCategoriesForType = (type: string) => {
    const categoryMap = {
      incident: [
        "Hardware",
        "Software",
        "Network",
        "Security",
        "Email",
        "Account Management",
        "Printing",
        "Phone/VoIP",
        "Database",
        "Server"
      ],
      request: [
        "Access Request",
        "Software Installation",
        "Hardware Request",
        "Account Creation",
        "Permission Change",
        "Training Request",
        "Documentation",
        "Consultation"
      ],
      problem: [
        "Recurring Hardware Issues",
        "Software Bugs",
        "Performance Issues",
        "System Outages",
        "Configuration Problems",
        "Integration Issues"
      ],
      change: [
        "Software Updates",
        "Hardware Upgrades",
        "Configuration Changes",
        "System Maintenance",
        "Security Patches",
        "Infrastructure Changes"
      ]
    };
    return categoryMap[type as keyof typeof categoryMap] || [];
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) newErrors.type = "Please select a ticket type";
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.requester_email.trim()) newErrors.requester_email = "Requester email is required";
    if (formData.requester_email && !/\S+@\S+\.\S+/.test(formData.requester_email)) {
      newErrors.requester_email = "Please enter a valid email address";
    }

    if (formData.type === "change" && !formData.change_type) {
      newErrors.change_type = "Change type is required for change requests";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log("Submitting ticket with data:", formData);
      const response = await api.post("/api/tickets", formData);

      if (response.ok) {
        const newTicket = await response.json();
        toast({
          title: "Success",
          description: `Ticket ${newTicket.ticket_number} created successfully`,
        });
        setLocation("/tickets");
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error occurred" }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create ticket`);
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create ticket";
      toast({
        title: "Error",
        description: errorMessage,
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

  const renderTypeSelector = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Settings className="w-5 h-5 mr-2 text-blue-600" />
          Select Ticket Type
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose the type of request or issue you need assistance with
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(typeIcons).map(([type, IconComponent]) => (
            <Card
              key={type}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                formData.type === type 
                  ? `bg-gradient-to-br ${typeColors[type as keyof typeof typeColors]} border-current` 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => updateFormData("type", type)}
            >
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  <div className={`mx-auto w-12 h-12 rounded-lg flex items-center justify-center ${
                    type === 'request' ? 'bg-green-100 text-green-600' :
                    type === 'incident' ? 'bg-red-100 text-red-600' :
                    type === 'problem' ? 'bg-orange-100 text-orange-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold capitalize mb-1">
                      {type === 'request' ? 'Service Request' : type}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {typeDescriptions[type as keyof typeof typeDescriptions]}
                    </p>
                  </div>
                  {formData.type === type && (
                    <Badge className="bg-blue-600 text-white text-xs">
                      Selected
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {errors.type && (
          <p className="text-red-600 text-sm mt-3">{errors.type}</p>
        )}
      </CardContent>
    </Card>
  );

  const renderBasicFields = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          {formData.type === 'request' && <Ticket className="w-5 h-5 mr-2 text-green-600" />}
          {formData.type === 'incident' && <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />}
          {formData.type === 'problem' && <Wrench className="w-5 h-5 mr-2 text-orange-600" />}
          {formData.type === 'change' && <RefreshCw className="w-5 h-5 mr-2 text-blue-600" />}
          {formData.type === 'request' ? 'Service Request' : formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateFormData("title", e.target.value)}
              placeholder={`Brief description of the ${formData.type}`}
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
            <Select
              value={formData.category}
              onValueChange={(value) => updateFormData("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {getCategoriesForType(formData.type).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            placeholder={
              formData.type === 'request' ? 'Describe what you need (software installation, hardware request, access permissions, etc.)' :
              formData.type === 'incident' ? 'Describe the issue, when it started, who is affected, and any error messages' :
              formData.type === 'problem' ? 'Describe the recurring issue pattern and any known related incidents' :
              'Describe the change requirements, business justification, and expected outcomes'
            }
            rows={4}
            className={errors.description ? "border-red-500" : ""}
          />
          {errors.description && <p className="text-red-600 text-xs">{errors.description}</p>}
        </div>
      </CardContent>
    </Card>
  );

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'incident':
        return (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                Incident Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="impact" className="text-sm font-medium">
                    Business Impact
                  </Label>
                  <Select value={formData.impact} onValueChange={(value) => updateFormData("impact", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select impact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Single user affected</SelectItem>
                      <SelectItem value="medium">Medium - Small group affected</SelectItem>
                      <SelectItem value="high">High - Department affected</SelectItem>
                      <SelectItem value="critical">Critical - Organization-wide impact</SelectItem>
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
                      <SelectItem value="low">Low - Can wait for normal hours</SelectItem>
                      <SelectItem value="medium">Medium - Should be resolved today</SelectItem>
                      <SelectItem value="high">Needs immediate attention</SelectItem>
                      <SelectItem value="critical">Emergency response needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'change':
        return (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <RefreshCw className="w-5 h-5 mr-2 text-blue-600" />
                Change Management Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                      <SelectItem value="standard">Standard - Pre-approved</SelectItem>
                      <SelectItem value="normal">Normal - Requires approval</SelectItem>
                      <SelectItem value="emergency">Emergency - Immediate change</SelectItem>
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
                      <SelectItem value="low">Low - Minimal risk</SelectItem>
                      <SelectItem value="medium">Medium - Moderate risk</SelectItem>
                      <SelectItem value="high">High - Significant risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled_start" className="text-sm font-medium">
                    Preferred Implementation Date
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
                    placeholder="Describe the step-by-step implementation process"
                    rows={3}
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
                    placeholder="Describe how to rollback if the change fails"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'problem':
        return (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Wrench className="w-5 h-5 mr-2 text-orange-600" />
                Problem Management Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="known_error" className="text-sm font-medium">
                  Known Error Status
                </Label>
                <Select
                  value={formData.known_error ? "true" : "false"}
                  onValueChange={(value) => updateFormData("known_error", value === "true")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Is this a known error?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">New Problem - Requires investigation</SelectItem>
                    <SelectItem value="true">Known Error - Workaround available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );

      case 'request':
      default:
        return (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Ticket className="w-5 h-5 mr-2 text-green-600" />
                Service Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="impact" className="text-sm font-medium">
                    Business Justification
                  </Label>
                  <Select value={formData.impact} onValueChange={(value) => updateFormData("impact", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select justification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Personal productivity</SelectItem>
                      <SelectItem value="medium">Team requirement</SelectItem>
                      <SelectItem value="high">Department initiative</SelectItem>
                      <SelectItem value="critical">Critical business need</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency" className="text-sm font-medium">
                    Required By
                  </Label>
                  <Select value={formData.urgency} onValueChange={(value) => updateFormData("urgency", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">No specific deadline</SelectItem>
                      <SelectItem value="medium">Within 2 weeks</SelectItem>
                      <SelectItem value="high">Within 1 week</SelectItem>
                      <SelectItem value="critical">ASAP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
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
              Fill in the details for your ticket
            </p>
          </div>
          <div className="w-32"> {/* Spacer for centering */}
          </div>
        </div>

        {/* Type Selector */}
        {renderTypeSelector()}

        {/* Basic Fields */}
        {renderBasicFields()}

        {/* Type-Specific Fields */}
        {renderTypeSpecificFields()}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setLocation('/tickets')}
            className="min-w-24"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.title || !formData.description || !formData.requester_email}
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
        </div>
      </div>
    </div>
  );
}