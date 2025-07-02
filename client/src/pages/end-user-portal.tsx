
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  AlertTriangle,
  Settings,
  Laptop,
  Wifi,
  HelpCircle,
  Send,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TicketRequest {
  type: 'service_request' | 'incident';
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  contact_method: 'email' | 'phone' | 'chat';
}

const SERVICE_CATEGORIES = [
  { id: 'hardware', name: 'Hardware Request', icon: Laptop, description: 'New equipment, replacements, upgrades' },
  { id: 'software', name: 'Software Request', icon: Settings, description: 'Application access, licenses, installations' },
  { id: 'access', name: 'Access Request', icon: User, description: 'System access, permissions, accounts' },
  { id: 'other', name: 'Other Service', icon: Briefcase, description: 'General service requests' },
];

const INCIDENT_CATEGORIES = [
  { id: 'hardware_issue', name: 'Hardware Issue', icon: Laptop, description: 'Computer, printer, phone problems' },
  { id: 'software_issue', name: 'Software Issue', icon: Settings, description: 'Application errors, crashes, bugs' },
  { id: 'network_issue', name: 'Network Issue', icon: Wifi, description: 'Internet, email, connectivity problems' },
  { id: 'account_issue', name: 'Account Issue', icon: User, description: 'Login problems, password resets' },
  { id: 'other_issue', name: 'Other Issue', icon: HelpCircle, description: 'General technical problems' },
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', description: 'Non-urgent, can wait', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', description: 'Normal business priority', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', description: 'Important, affects productivity', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', description: 'Critical, business stopped', color: 'bg-red-100 text-red-800' },
];

export default function EndUserPortal() {
  const [activeTab, setActiveTab] = useState<'service_request' | 'incident'>('service_request');
  const [formData, setFormData] = useState<TicketRequest>({
    type: 'service_request',
    category: '',
    priority: 'medium',
    subject: '',
    description: '',
    contact_method: 'email',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const categories = activeTab === 'service_request' ? SERVICE_CATEGORIES : INCIDENT_CATEGORIES;

  const handleTabChange = (tab: 'service_request' | 'incident') => {
    setActiveTab(tab);
    setFormData(prev => ({
      ...prev,
      type: tab,
      category: '',
    }));
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormData(prev => ({ ...prev, category: categoryId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.subject || !formData.description) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.subject,
          description: formData.description,
          priority: formData.priority,
          category: formData.category,
          type: formData.type,
          contact_method: formData.contact_method,
          source: 'end_user_portal',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Request submitted successfully!",
          description: `Your ${formData.type.replace('_', ' ')} has been created. Ticket #${result.ticket_number}`,
        });
        
        // Reset form
        setFormData({
          type: activeTab,
          category: '',
          priority: 'medium',
          subject: '',
          description: '',
          contact_method: 'email',
        });
      } else {
        throw new Error('Failed to submit request');
      }
    } catch (error) {
      toast({
        title: "Failed to submit request",
        description: "Please try again or contact IT support directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">IT Service Portal</h1>
          <p className="text-gray-600">Submit service requests and report technical issues</p>
        </div>

        {/* Tab Selection */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => handleTabChange('service_request')}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                activeTab === 'service_request'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Briefcase className="w-4 h-4 inline mr-2" />
              Service Request
            </button>
            <button
              onClick={() => handleTabChange('incident')}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                activeTab === 'incident'
                  ? 'bg-red-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Report Issue
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'service_request' ? 'What do you need?' : 'What type of issue are you experiencing?'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategorySelect(category.id)}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        formData.category === category.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className={`w-6 h-6 mt-1 ${
                          formData.category === category.id ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                        <div>
                          <h3 className="font-medium text-gray-900">{category.name}</h3>
                          <p className="text-sm text-gray-600">{category.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Priority Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Priority Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PRIORITY_LEVELS.map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, priority: priority.value as any }))}
                    className={`p-3 border-2 rounded-lg text-center transition-colors ${
                      formData.priority === priority.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Badge className={`${priority.color} mb-2`}>{priority.label}</Badge>
                    <p className="text-xs text-gray-600">{priority.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of your request or issue"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide detailed information about your request or issue. Include any error messages, steps to reproduce, or specific requirements."
                  rows={5}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Contact Method
                </label>
                <Select
                  value={formData.contact_method}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, contact_method: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email
                    </SelectItem>
                    <SelectItem value="phone">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone
                    </SelectItem>
                    <SelectItem value="chat">
                      <HelpCircle className="w-4 h-4 inline mr-2" />
                      Chat/Teams
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.category || !formData.subject || !formData.description}
              className="px-8 py-3 text-lg"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit {activeTab === 'service_request' ? 'Request' : 'Issue'}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="w-5 h-5 mr-2" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <Phone className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-medium">Call IT Support</h3>
                <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
              </div>
              <div>
                <Mail className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-medium">Email Support</h3>
                <p className="text-sm text-gray-600">support@company.com</p>
              </div>
              <div>
                <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-medium">Business Hours</h3>
                <p className="text-sm text-gray-600">Mon-Fri 8AM-6PM</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
