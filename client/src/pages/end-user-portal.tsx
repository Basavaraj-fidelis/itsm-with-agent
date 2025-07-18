
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

export default function EndUserPortal() {
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<UserTicket[]>([]);
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
  const { toast } = useToast();

  // Simple authentication for end users
  const handleLogin = async (email: string) => {
    try {
      setLoading(true);

      // For end users, we'll do a simple email-based authentication
      const response = await fetch("/api/auth/portal-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
        fetchUserTickets(email);
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Invalid email or user not found",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to login",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for existing session
    const savedEmail = localStorage.getItem("portal_user_email");
    if (savedEmail) {
      setUserEmail(savedEmail);
      handleLogin(savedEmail);
    }
  }, []);

  const fetchUserTickets = async (email: string) => {
    try {
      const response = await fetch(
        `/api/tickets?search=${encodeURIComponent(email)}`,
      );

      if (response.ok) {
        const data = await response.json();
        // Filter tickets by requester email
        const userTickets = (data.data || data).filter(
          (ticket: any) => ticket.requester_email === email,
        );
        setTickets(userTickets);
        localStorage.setItem("portal_user_email", email);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    }
  };

  const handleCreateTicket = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newTicket,
          requester_email: userEmail,
          contact_method: "email",
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Ticket created successfully",
        });
        setNewTicket({
          title: "",
          description: "",
          category: "",
          priority: "medium",
          type: "incident",
        });
        setShowCreateTicket(false);
        fetchUserTickets(userEmail);
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
                        <p>• user@company.com</p>
                        <p>• john.doe@company.com</p>
                        <p>• admin@company.com</p>
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
                Welcome, {user?.email || userEmail}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  localStorage.removeItem("portal_user_email");
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
        <Tabs defaultValue="tickets" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tickets">My Tickets</TabsTrigger>
            <TabsTrigger value="create">Create Ticket</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">My Support Tickets</h2>
              <Button onClick={() => fetchUserTickets(userEmail)}>
                Refresh
              </Button>
            </div>

            <div className="grid gap-4">
              {tickets.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <TicketIcon className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No tickets found
                    </h3>
                    <p className="text-gray-600 text-center mb-4">
                      You haven't submitted any support tickets yet.
                    </p>
                    <Button onClick={() => setShowCreateTicket(true)}>
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

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Support Ticket</CardTitle>
                <p className="text-gray-600">
                  Describe your issue or request and we'll help you as soon as
                  possible.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Request Type</Label>
                    <Select
                      value={newTicket.type}
                      onValueChange={(value) =>
                        setNewTicket({ ...newTicket, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incident">
                          Incident (Something is broken)
                        </SelectItem>
                        <SelectItem value="service_request">
                          Service Request (I need something)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
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
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newTicket.category}
                    onValueChange={(value) =>
                      setNewTicket({ ...newTicket, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {newTicket.type === "service_request"
                        ? SERVICE_CATEGORIES.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex flex-col">
                                <span>{category.name}</span>
                                <span className="text-xs text-gray-500">
                                  {category.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        : INCIDENT_CATEGORIES.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex flex-col">
                                <span>{category.name}</span>
                                <span className="text-xs text-gray-500">
                                  {category.description}
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
