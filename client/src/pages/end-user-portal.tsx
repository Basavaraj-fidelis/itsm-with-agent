
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Monitor,
  Activity,
  TicketIcon,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TicketRequest {
  type: 'service_request' | 'incident';
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  email: string;
  phone: string;
  subject: string;
  description: string;
  contact_method: 'email' | 'phone' | 'chat';
}

interface UserTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  category: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
}

interface UserDevice {
  id: string;
  hostname: string;
  ip_address: string;
  os_name: string;
  os_version: string;
  status: string;
  last_seen: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
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

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'new': return 'bg-blue-100 text-blue-800';
    case 'assigned': return 'bg-purple-100 text-purple-800';
    case 'in_progress': return 'bg-yellow-100 text-yellow-800';
    case 'resolved': return 'bg-green-100 text-green-800';
    case 'closed': return 'bg-gray-100 text-gray-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'low': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'urgent': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getDeviceStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'online': return 'bg-green-100 text-green-800';
    case 'offline': return 'bg-red-100 text-red-800';
    case 'warning': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function EndUserPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'tickets' | 'devices' | 'create'>('tickets');
  const [activeCreateTab, setActiveCreateTab] = useState<'service_request' | 'incident'>('service_request');
  const [formData, setFormData] = useState<TicketRequest>({
    type: 'service_request',
    category: '',
    priority: 'medium',
    email: '',
    phone: '',
    subject: '',
    description: '',
    contact_method: 'email',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [userDevices, setUserDevices] = useState<UserDevice[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const { toast } = useToast();

  // Check if user is already authenticated
  React.useEffect(() => {
    const token = localStorage.getItem('end_user_token');
    const user = localStorage.getItem('end_user_info');
    if (token && user) {
      setIsAuthenticated(true);
      setUserInfo(JSON.parse(user));
      setFormData(prev => ({ ...prev, email: JSON.parse(user).email }));
    }
  }, []);

  // Load user tickets and devices when authenticated
  useEffect(() => {
    if (isAuthenticated && userInfo) {
      loadUserTickets();
      loadUserDevices();
    }
  }, [isAuthenticated, userInfo]);

  const loadUserTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const token = localStorage.getItem('end_user_token');
      const response = await fetch('/api/tickets?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        // Filter tickets by user email
        const userTickets = result.data.filter((ticket: UserTicket) => 
          ticket.requester_email?.toLowerCase() === userInfo.email.toLowerCase()
        );
        setUserTickets(userTickets);
      }
    } catch (error) {
      console.error('Error loading user tickets:', error);
      toast({
        title: "Error loading tickets",
        description: "Unable to load your tickets",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const loadUserDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const token = localStorage.getItem('end_user_token');
      const response = await fetch('/api/devices', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const devices = await response.json();
        // Filter devices by user email (assigned_user field)
        const userDevices = devices.filter((device: UserDevice) => 
          device.assigned_user?.toLowerCase() === userInfo.email.toLowerCase()
        );
        setUserDevices(userDevices);
      }
    } catch (error) {
      console.error('Error loading user devices:', error);
      toast({
        title: "Error loading devices",
        description: "Unable to load your devices",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      const response = await fetch('/api/auth/end-user-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      if (response.ok) {
        const result = await response.json();
        localStorage.setItem('end_user_token', result.token);
        localStorage.setItem('end_user_info', JSON.stringify(result.user));
        setIsAuthenticated(true);
        setUserInfo(result.user);
        setFormData(prev => ({ ...prev, email: result.user.email }));
        toast({
          title: "Login successful",
          description: "Welcome to the IT Service Portal",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Login failed",
          description: error.message || "Invalid email or password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Unable to connect to the server",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('end_user_token');
    localStorage.removeItem('end_user_info');
    setIsAuthenticated(false);
    setUserInfo(null);
    setFormData(prev => ({ ...prev, email: '' }));
    setUserTickets([]);
    setUserDevices([]);
  };

  const categories = activeCreateTab === 'service_request' ? SERVICE_CATEGORIES : INCIDENT_CATEGORIES;

  const handleTabChange = (tab: 'service_request' | 'incident') => {
    setActiveCreateTab(tab);
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
    
    if (!formData.category || !formData.email || !formData.subject || !formData.description) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('end_user_token');
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.subject,
          description: formData.description,
          priority: formData.priority,
          category: formData.category,
          type: formData.type,
          contact_method: formData.contact_method,
          requester_email: formData.email,
          requester_phone: formData.phone,
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
          type: activeCreateTab,
          category: '',
          priority: 'medium',
          email: userInfo.email,
          phone: '',
          subject: '',
          description: '',
          contact_method: 'email',
        });

        // Reload tickets to show the new one
        loadUserTickets();
        
        // Switch to tickets tab
        setActiveTab('tickets');
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

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">IT Service Portal</h1>
              <p className="text-gray-600">Sign in to submit service requests and view your tickets</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full"
              >
                {isLoggingIn ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Need help? Contact IT Support at{' '}
                <a href="mailto:support@company.com" className="text-blue-600 hover:underline">
                  support@company.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {userInfo?.first_name || userInfo?.name || userInfo?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">IT Service Portal</h1>
          <p className="text-gray-600">View your tickets, devices, and submit new requests</p>
        </div>

        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tickets" className="flex items-center">
              <TicketIcon className="w-4 h-4 mr-2" />
              My Tickets ({userTickets.length})
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex items-center">
              <Monitor className="w-4 h-4 mr-2" />
              My Devices ({userDevices.length})
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center">
              <Send className="w-4 h-4 mr-2" />
              Create Request
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TicketIcon className="w-5 h-5 mr-2" />
                  My Support Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTickets ? (
                  <div className="flex items-center justify-center py-8">
                    <Clock className="w-6 h-6 animate-spin mr-2" />
                    Loading your tickets...
                  </div>
                ) : userTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <TicketIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
                    <p className="text-gray-600 mb-4">You haven't submitted any support requests yet.</p>
                    <Button onClick={() => setActiveTab('create')}>
                      Create Your First Request
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userTickets.map((ticket) => (
                      <div key={ticket.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-medium text-gray-900">{ticket.ticket_number}</h3>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status}
                              </Badge>
                              <Badge className={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                            </div>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">{ticket.title}</h4>
                            <p className="text-gray-600 mb-2 line-clamp-2">{ticket.description}</p>
                            <div className="flex items-center text-sm text-gray-500 space-x-4">
                              <span>Type: {ticket.type?.replace('_', ' ')}</span>
                              <span>Category: {ticket.category}</span>
                              <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                              {ticket.assigned_to && <span>Assigned to: {ticket.assigned_to}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  My Devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingDevices ? (
                  <div className="flex items-center justify-center py-8">
                    <Clock className="w-6 h-6 animate-spin mr-2" />
                    Loading your devices...
                  </div>
                ) : userDevices.length === 0 ? (
                  <div className="text-center py-8">
                    <Monitor className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
                    <p className="text-gray-600">No devices are currently assigned to your account.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userDevices.map((device) => (
                      <div key={device.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <Monitor className="w-5 h-5 text-gray-400 mr-2" />
                            <h3 className="font-medium text-gray-900">{device.hostname}</h3>
                          </div>
                          <Badge className={getDeviceStatusColor(device.status)}>
                            {device.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">IP Address:</span>
                            <span className="font-medium">{device.ip_address}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">OS:</span>
                            <span className="font-medium">{device.os_name} {device.os_version}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last Seen:</span>
                            <span className="font-medium">
                              {new Date(device.last_seen).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {(device.cpu_usage || device.memory_usage || device.disk_usage) && (
                          <div className="mt-4 pt-3 border-t">
                            <div className="flex items-center mb-2">
                              <Activity className="w-4 h-4 text-gray-400 mr-1" />
                              <span className="text-sm font-medium text-gray-600">Performance</span>
                            </div>
                            <div className="space-y-1 text-xs">
                              {device.cpu_usage && (
                                <div className="flex justify-between">
                                  <span>CPU:</span>
                                  <span>{device.cpu_usage.toFixed(1)}%</span>
                                </div>
                              )}
                              {device.memory_usage && (
                                <div className="flex justify-between">
                                  <span>Memory:</span>
                                  <span>{device.memory_usage.toFixed(1)}%</span>
                                </div>
                              )}
                              {device.disk_usage && (
                                <div className="flex justify-between">
                                  <span>Disk:</span>
                                  <span>{device.disk_usage.toFixed(1)}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            {/* Tab Selection */}
            <div className="flex justify-center mb-8">
              <div className="bg-white rounded-lg p-1 shadow-sm border">
                <button
                  onClick={() => handleTabChange('service_request')}
                  className={`px-6 py-3 rounded-md font-medium transition-colors ${
                    activeCreateTab === 'service_request'
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
                    activeCreateTab === 'incident'
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
                    {activeCreateTab === 'service_request' ? 'What do you need?' : 'What type of issue are you experiencing?'}
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
                      Office Email Address *
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your.name@company.com"
                      required
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

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
                  disabled={isSubmitting || !formData.category || !formData.email || !formData.subject || !formData.description}
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
                      Submit {activeCreateTab === 'service_request' ? 'Request' : 'Issue'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>

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
