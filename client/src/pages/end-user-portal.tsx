
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedErrorBoundary } from "@/components/ui/enhanced-error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Shield,
  ArrowRight,
  LogIn,
  Headphones,
  FileText,
  Users,
  Zap,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  requester_email: string;
}

interface UserDevice {
  id: string;
  hostname: string;
  ip_address: string;
  os_name: string;
  os_version: string;
  status: string;
  last_seen: string;
  assigned_user?: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
}

const SERVICE_CATEGORIES = [
  {
    id: "hardware",
    name: "Hardware Request",
    icon: Laptop,
    description: "New equipment, replacements, upgrades",
  },
  {
    id: "software",
    name: "Software Request",
    icon: Settings,
    description: "Application access, licenses, installations",
  },
  {
    id: "access",
    name: "Access Request",
    icon: User,
    description: "System access, permissions, accounts",
  },
  {
    id: "other",
    name: "Other Service",
    icon: Briefcase,
    description: "General service requests",
  },
];

const INCIDENT_CATEGORIES = [
  {
    id: "hardware_issue",
    name: "Hardware Issue",
    icon: Laptop,
    description: "Computer, printer, phone problems",
  },
  {
    id: "software_issue",
    name: "Software Issue",
    icon: Settings,
    description: "Application errors, crashes, bugs",
  },
  {
    id: "network_issue",
    name: "Network Issue",
    icon: Wifi,
    description: "Internet, email, connectivity problems",
  },
  {
    id: "account_issue",
    name: "Account Issue",
    icon: User,
    description: "Login problems, password resets",
  },
  {
    id: "other_issue",
    name: "Other Issue",
    icon: HelpCircle,
    description: "General technical problems",
  },
];

const PRIORITY_LEVELS = [
  {
    value: "low",
    label: "Low",
    description: "Non-urgent, can wait",
    color: "bg-green-100 text-green-800",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Normal business priority",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "high",
    label: "High",
    description: "Important, affects productivity",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "urgent",
    label: "Urgent",
    description: "Critical, business stopped",
    color: "bg-red-100 text-red-800",
  },
];

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "new":
      return "bg-blue-100 text-blue-800";
    case "assigned":
      return "bg-purple-100 text-purple-800";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800";
    case "resolved":
      return "bg-green-100 text-green-800";
    case "closed":
      return "bg-gray-100 text-gray-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "low":
      return "bg-green-100 text-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "high":
      return "bg-orange-100 text-orange-800";
    case "urgent":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
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
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium",
    type: "incident",
  });
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'tickets' | 'devices' | 'create'>('tickets');
  const [activeCreateTab, setActiveCreateTab] = useState<'service_request' | 'incident'>('service_request');
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const { toast } = useToast();
  const [error, setError] = useState("");

  // Simple authentication for end users
  const handleLogin = async (email: string) => {
    try {
      setError('');
      setLoading(true);

      const response = await fetch('/api/auth/portal-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();

      if (data.success && data.token) {
        // Store token and user info
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('portal_user_email', email);
        setIsAuthenticated(true);
        setUser(data.user);
        setUserEmail(email);
        
        toast({
          title: "Login successful",
          description: "Welcome to the IT Service Portal",
        });
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to login');
      toast({
        title: "Login failed",
        description: error.message || "Please check your email and try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for existing session
    const savedEmail = localStorage.getItem("portal_user_email");
    const token = localStorage.getItem("auth_token");
    if (savedEmail && token) {
      setUserEmail(savedEmail);
      handleLogin(savedEmail);
    }
  }, []);

  // Load user data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserTickets();
      fetchUserDevices();
    }
  }, [isAuthenticated, user]);

  const fetchUserTickets = async () => {
    if (!user?.email) return;
    
    setIsLoadingTickets(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/tickets?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        // Filter tickets by user email
        const userTickets = (result.data || result).filter(
          (ticket: UserTicket) => ticket.requester_email?.toLowerCase() === user.email.toLowerCase()
        );
        setTickets(userTickets);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error loading tickets",
        description: "Unable to load your tickets",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const fetchUserDevices = async () => {
    if (!user?.email) return;
    
    setIsLoadingDevices(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/devices', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        // Filter devices by assigned user
        const userDevices = result.filter(
          (device: UserDevice) => device.assigned_user?.toLowerCase() === user.email.toLowerCase()
        );
        setDevices(userDevices);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
      toast({
        title: "Error loading devices",
        description: "Unable to load your devices",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleCreateTicket = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newTicket,
          requester_email: user.email,
          contact_method: "email",
          source: "end_user_portal",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: `Ticket created successfully. Ticket #${result.ticket_number}`,
        });
        setNewTicket({
          title: "",
          description: "",
          category: "",
          priority: "medium",
          type: "incident",
        });
        setShowCreateTicket(false);
        fetchUserTickets();
        setActiveTab('tickets');
      } else {
        toast({
          title: "Error",
          description: "Failed to create ticket",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'service_request' | 'incident') => {
    setActiveCreateTab(tab);
    setNewTicket(prev => ({
      ...prev,
      type: tab,
      category: '',
    }));
  };

  const categories = activeCreateTab === 'service_request' ? SERVICE_CATEGORIES : INCIDENT_CATEGORIES;

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%2323ffffff%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%227%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>

        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left Side - Branding & Features */}
          <div className="hidden lg:block text-slate-700 dark:text-white space-y-8">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl">
                  <Headphones className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    IT Service Portal
                  </h1>
                  <p className="text-xl text-slate-600 dark:text-blue-200">
                    Your Gateway to IT Support
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-blue-100">
                  Get Help. Stay Productive.
                </h2>
                <p className="text-lg text-slate-600 dark:text-blue-200 leading-relaxed">
                  Submit tickets, track requests, and access IT resources all in one place. 
                  Our support team is here to keep you running smoothly.
                </p>
              </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-white/20 hover:shadow-lg transition-shadow">
                <TicketIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
                <h3 className="font-semibold text-slate-800 dark:text-white mb-2">
                  Easy Ticket Submission
                </h3>
                <p className="text-sm text-slate-600 dark:text-blue-200">
                  Quick and simple issue reporting
                </p>
              </div>

              <div className="bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-white/20 hover:shadow-lg transition-shadow">
                <Clock className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
                <h3 className="font-semibold text-slate-800 dark:text-white mb-2">
                  Real-time Tracking
                </h3>
                <p className="text-sm text-slate-600 dark:text-blue-200">
                  Monitor your requests live
                </p>
              </div>

              <div className="bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-white/20 hover:shadow-lg transition-shadow">
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
                <h3 className="font-semibold text-slate-800 dark:text-white mb-2">
                  Expert Support
                </h3>
                <p className="text-sm text-slate-600 dark:text-blue-200">
                  Dedicated IT professionals
                </p>
              </div>

              <div className="bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-white/20 hover:shadow-lg transition-shadow">
                <Zap className="w-8 h-8 text-orange-600 dark:text-orange-400 mb-3" />
                <h3 className="font-semibold text-slate-800 dark:text-white mb-2">
                  Fast Resolution
                </h3>
                <p className="text-sm text-slate-600 dark:text-blue-200">
                  Quick turnaround times
                </p>
              </div>
            </div>

            {/* Support Hours */}
            <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-600/20 dark:to-indigo-600/20 rounded-xl p-6 border border-blue-200/50 dark:border-blue-400/30">
              <div className="flex items-center space-x-3 mb-3">
                <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-slate-800 dark:text-white">
                  Support Hours
                </h3>
              </div>
              <div className="space-y-1 text-sm text-slate-600 dark:text-blue-200">
                <p><strong>Monday - Friday:</strong> 8:00 AM - 6:00 PM</p>
                <p><strong>Emergency Support:</strong> 24/7 Available</p>
                <p><strong>Response Time:</strong> Within 4 hours</p>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <Headphones className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
                IT Service Portal
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Your Gateway to IT Support
              </p>
            </div>

            {/* Login Card */}
            <Card className="shadow-2xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg">
              <CardHeader className="space-y-2 pb-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                    <LogIn className="w-6 h-6 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-slate-800 dark:text-white">
                  Access Your Portal
                </CardTitle>
                <p className="text-slate-600 dark:text-slate-400">
                  Enter your company email to continue
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                      <Mail className="w-4 h-4" />
                      <span>Company Email Address</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="your.email@company.com"
                      className="h-12 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 text-base"
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && userEmail.trim()) {
                          handleLogin(userEmail.trim());
                        }
                      }}
                    />
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm mt-2">
                      {error}
                    </div>
                  )}

                  <Button
                    onClick={() => handleLogin(userEmail.trim())}
                    disabled={loading || !userEmail.trim()}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Accessing Portal...</span>
                      </div>
                    ) : (
                      <>
                        Access Portal
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>

                <Separator className="my-6" />

                {/* Demo Notice */}
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                        Demo Portal Access
                      </p>
                      <p className="text-blue-700 dark:text-blue-300 mb-2">
                        Try these demo accounts:
                      </p>
                      <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
                        <p>• david.brown@company.com</p>
                        <p>• user@company.com</p>
                        <p>• john.doe@company.com</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Notice */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                    <Lock className="w-3 h-3" />
                    <span>Secure • Encrypted • Protected</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your data is protected with enterprise-grade security
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
              <p>© 2024 IT Service Portal. Professional IT Support.</p>
              <p className="mt-1">Need help? Contact IT Support: support@company.com</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <EnhancedErrorBoundary 
      context="End User Portal"
      allowRetry={true}
      showReportButton={true}
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Self Service Portal
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Welcome, {user?.name || user?.email || userEmail}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem("portal_user_email");
                    localStorage.removeItem("auth_token");
                    setIsAuthenticated(false);
                    setUser(null);
                    setUserEmail("");
                  }}
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tickets" className="flex items-center">
                <TicketIcon className="w-4 h-4 mr-2" />
                My Tickets ({tickets.length})
              </TabsTrigger>
              <TabsTrigger value="devices" className="flex items-center">
                <Monitor className="w-4 h-4 mr-2" />
                My Devices ({devices.length})
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center">
                <Send className="w-4 h-4 mr-2" />
                Create Request
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">My Support Tickets</h2>
                <Button onClick={() => fetchUserTickets()}>
                  Refresh
                </Button>
              </div>

              <div className="grid gap-4">
                {isLoadingTickets ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <Clock className="w-6 h-6 animate-spin mr-2" />
                      Loading your tickets...
                    </CardContent>
                  </Card>
                ) : tickets.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <TicketIcon className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No tickets found
                      </h3>
                      <p className="text-gray-600 text-center mb-4">
                        You haven't submitted any support tickets yet.
                      </p>
                      <Button onClick={() => setActiveTab('create')}>
                        Create Your First Ticket
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  tickets.map((ticket) => (
                    <Card key={ticket.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {ticket.title}
                            </CardTitle>
                            <p className="text-sm text-gray-600 mt-1">
                              {ticket.ticket_number} • Created{" "}
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status.replace("_", " ")}
                            </Badge>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 mb-4">{ticket.description}</p>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>Type: {ticket.type?.replace("_", " ")}</span>
                          <span>
                            Category: {ticket.category?.replace("_", " ")}
                          </span>
                          {ticket.assigned_to && (
                            <span>Assigned to: {ticket.assigned_to}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="devices" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">My Devices</h2>
                <Button onClick={() => fetchUserDevices()}>
                  Refresh
                </Button>
              </div>

              <div className="grid gap-4">
                {isLoadingDevices ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <Clock className="w-6 h-6 animate-spin mr-2" />
                      Loading your devices...
                    </CardContent>
                  </Card>
                ) : devices.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Monitor className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No devices found
                      </h3>
                      <p className="text-gray-600 text-center mb-4">
                        No devices are currently assigned to your account.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {devices.map((device) => (
                      <Card key={device.id}>
                        <CardContent className="p-4">
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
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
                          onClick={() => setNewTicket(prev => ({ ...prev, category: category.id }))}
                          className={`p-4 border-2 rounded-lg text-left transition-colors ${
                            newTicket.category === category.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <Icon className={`w-6 h-6 mt-1 ${
                              newTicket.category === category.id ? 'text-blue-500' : 'text-gray-400'
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

              {/* Priority and Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select
                      value={newTicket.priority}
                      onValueChange={(value) =>
                        setNewTicket({ ...newTicket, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_LEVELS.map((priority) => (
                          <SelectItem
                            key={priority.value}
                            value={priority.value}
                          >
                            <div className="flex flex-col">
                              <span>{priority.label}</span>
                              <span className="text-xs text-gray-500">
                                {priority.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="title">Subject</Label>
                    <Input
                      id="title"
                      value={newTicket.title}
                      onChange={(e) =>
                        setNewTicket({ ...newTicket, title: e.target.value })
                      }
                      placeholder="Brief description of your issue or request"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newTicket.description}
                      onChange={(e) =>
                        setNewTicket({
                          ...newTicket,
                          description: e.target.value,
                        })
                      }
                      placeholder="Provide detailed information about your issue or request"
                      rows={5}
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewTicket({
                          title: "",
                          description: "",
                          category: "",
                          priority: "medium",
                          type: "incident",
                        });
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={handleCreateTicket}
                      disabled={
                        loading ||
                        !newTicket.title ||
                        !newTicket.description ||
                        !newTicket.category
                      }
                    >
                      {loading ? "Creating..." : "Create Ticket"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </EnhancedErrorBoundary>
  );
}
