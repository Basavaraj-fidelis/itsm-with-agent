
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
  Lock,
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
  requester_email?: string;
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
  assigned_user?: string;
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
    const checkAuth = async () => {
      const token = localStorage.getItem('end_user_token');
      const user = localStorage.getItem('end_user_info');
      
      if (token && user) {
        try {
          // Verify token is still valid
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const userData = JSON.parse(user);
            setIsAuthenticated(true);
            setUserInfo(userData);
            setFormData(prev => ({ ...prev, email: userData.email }));
            console.log('Auto-login successful for:', userData.email);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('end_user_token');
            localStorage.removeItem('end_user_info');
            console.log('Token expired, requiring fresh login');
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('end_user_token');
          localStorage.removeItem('end_user_info');
        }
      }
    };

    checkAuth();
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
      if (!token) {
        console.warn('No auth token available for loading tickets');
        setUserTickets([]);
        return;
      }

      console.log('Loading tickets for user:', userInfo?.email);
      
      const response = await fetch('/api/tickets?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'same-origin',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Tickets API response:', result);
        
        // Handle different response formats
        const ticketsData = Array.isArray(result?.data) 
          ? result.data 
          : result?.tickets || 
            (Array.isArray(result) ? result : []);
            
        // Filter tickets by user email
        const userTickets = ticketsData.filter((ticket: UserTicket) => 
          ticket.requester_email?.toLowerCase() === userInfo?.email?.toLowerCase()
        );
        
        setUserTickets(userTickets);
        console.log('Loaded user tickets:', userTickets.length, 'of', ticketsData.length, 'total');
      } else if (response.status === 401) {
        // Token expired, logout user
        handleLogout();
        toast({
          title: "Session expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
      } else {
        console.error('Failed to load tickets:', response.status, response.statusText);
        toast({
          title: "Error loading tickets",
          description: "Unable to load your tickets. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading user tickets:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast({
          title: "Connection Error",
          description: "Unable to connect to the server. Please check your connection.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error loading tickets",
          description: "Unable to load your tickets. Please try again.",
          variant: "destructive",
        });
      }
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
        const result = await response.json();
        // Handle different response formats
        const devicesData = Array.isArray(result?.data) 
          ? result.data 
          : result?.devices || 
            (Array.isArray(result) ? result : []);
            
        // Filter devices by user email (assigned_user field)
        const userDevices = devicesData.filter((device: UserDevice) => 
          device.assigned_user?.toLowerCase() === userInfo.email.toLowerCase()
        );
        setUserDevices(userDevices);
        console.log('Loaded user devices:', userDevices.length);
      } else {
        console.error('Failed to load devices:', response.status, response.statusText);
        // Don't show error for devices since they might not be assigned yet
        setUserDevices([]);
      }
    } catch (error) {
      console.error('Error loading user devices:', error);
      // Don't show toast error for devices as it's not critical
      setUserDevices([]);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      console.log('Attempting login with:', loginData.email);
      
      const response = await fetch('/api/auth/portal-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: loginData.email.trim(),
          password: loginData.password
        }),
      });

      console.log('Login response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Login successful:', result);
        
        // Store authentication data
        localStorage.setItem('end_user_token', result.token);
        localStorage.setItem('end_user_info', JSON.stringify(result.user));
        
        // Update state
        setIsAuthenticated(true);
        setUserInfo(result.user);
        setFormData(prev => ({ ...prev, email: result.user.email }));
        
        toast({
          title: "Login successful",
          description: `Welcome ${result.user.first_name || result.user.name || result.user.email}!`,
        });
      } else {
        const error = await response.json().catch(() => ({ error: 'Invalid response from server' }));
        console.error('Login failed:', error);
        
        toast({
          title: "Login failed", 
          description: error.error || error.message || "Invalid email or password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%2523ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%227%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
          {/* Left Side - Branding */}
          <div className="hidden lg:block text-white space-y-8">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl">
                  <User className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                    IT Service Portal
                  </h1>
                  <p className="text-blue-200 text-lg">End User Self Service</p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-blue-100">
                  Get IT Support When You Need It
                </h2>
                <p className="text-lg text-blue-200 leading-relaxed">
                  Submit tickets, track requests, and manage your IT resources 
                  through our streamlined self-service portal.
                </p>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <TicketIcon className="w-8 h-8 text-blue-300 mb-2" />
                <h3 className="font-semibold text-white">Quick Requests</h3>
                <p className="text-sm text-blue-200">Submit tickets instantly</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <Monitor className="w-8 h-8 text-green-300 mb-2" />
                <h3 className="font-semibold text-white">Device Tracking</h3>
                <p className="text-sm text-blue-200">Monitor your assets</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <Eye className="w-8 h-8 text-purple-300 mb-2" />
                <h3 className="font-semibold text-white">Real-time Status</h3>
                <p className="text-sm text-blue-200">Track ticket progress</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <CheckCircle className="w-8 h-8 text-emerald-300 mb-2" />
                <h3 className="font-semibold text-white">24/7 Access</h3>
                <p className="text-sm text-blue-200">Always available</p>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <User className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">IT Service Portal</h1>
              <p className="text-blue-200">End User Self Service</p>
            </div>

            {/* Login Card */}
            <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl font-bold text-center text-slate-800">
                  Welcome Back
                </CardTitle>
                <p className="text-sm text-slate-600 text-center">
                  Sign in to access your IT services
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <p className="text-xs text-blue-700 font-medium mb-2">Demo Credentials:</p>
                  <div className="space-y-1 text-xs text-blue-600">
                    <div><strong>End User:</strong> john.doe@company.com | TempPass123!</div>
                    <div><strong>Admin Test:</strong> admin@company.com | Admin123!</div>
                    <div><strong>Alt User:</strong> jane.smith@company.com | TempPass456!</div>
                  </div>
                  <div className="mt-2 text-xs text-blue-500">
                    <div>⚠️ If login fails, check browser console for details</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                      <Mail className="w-4 h-4 text-slate-600" />
                      <span>Email Address</span>
                    </label>
                    <Input
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your.email@company.com"
                      required
                      className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                      <Lock className="w-4 h-4 text-slate-600" />
                      <span>Password</span>
                    </label>
                    <Input
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter your password"
                      required
                      className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg"
                  >
                    {isLoggingIn ? (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Sign In</span>
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </Button>
                </form>

                <Separator className="my-6" />

                {/* Help Section */}
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
                      Need Assistance?
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <Phone className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">Call IT Support</p>
                        <p className="text-xs text-slate-600">+1 (555) 123-4567</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-100">
                      <Mail className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">Email Support</p>
                        <a href="mailto:support@company.com" className="text-xs text-green-600 hover:underline">
                          support@company.com
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <Clock className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">Business Hours</p>
                        <p className="text-xs text-slate-600">Mon-Fri 8AM-6PM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-white/70">
              <p>© 2024 IT Service Portal. Secure Self-Service Platform.</p>
              <p className="mt-1">Fast • Reliable • Always Available</p>
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
