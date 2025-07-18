
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function EndUserPortal() {
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium",
    type: "incident"
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
      const response = await fetch('/api/auth/portal-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
        fetchUserTickets(email);
        toast({
          title: "Success",
          description: "Logged in successfully"
        });
      } else {
        toast({
          title: "Error",
          description: "Invalid email or user not found",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to login",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for existing session
    const savedEmail = localStorage.getItem('portal_user_email');
    if (savedEmail) {
      setUserEmail(savedEmail);
      handleLogin(savedEmail);
    }
  }, []);

  const fetchUserTickets = async (email: string) => {
    try {
      const response = await fetch(`/api/tickets?search=${encodeURIComponent(email)}`);

      if (response.ok) {
        const data = await response.json();
        // Filter tickets by requester email
        const userTickets = (data.data || data).filter((ticket: any) => 
          ticket.requester_email === email
        );
        setTickets(userTickets);
        localStorage.setItem('portal_user_email', email);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const handleCreateTicket = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newTicket,
          requester_email: userEmail,
          contact_method: 'email'
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Ticket created successfully"
        });
        setNewTicket({
          title: "",
          description: "",
          category: "",
          priority: "medium",
          type: "incident"
        });
        setShowCreateTicket(false);
        fetchUserTickets(userEmail);
      } else {
        toast({
          title: "Error",
          description: "Failed to create ticket",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Self Service Portal</CardTitle>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Enter your email to access your tickets
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your.email@company.com"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && userEmail.trim()) {
                    handleLogin(userEmail.trim());
                  }
                }}
              />
            </div>
            <Button 
              onClick={() => handleLogin(userEmail.trim())}
              disabled={loading || !userEmail.trim()}
              className="w-full"
            >
              {loading ? "Accessing..." : "Access Portal"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
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
                  localStorage.removeItem('portal_user_email');
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
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
                          <CardTitle className="text-lg">{ticket.title}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {ticket.ticket_number} • Created {new Date(ticket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status.replace('_', ' ')}
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
                        <span>Type: {ticket.type?.replace('_', ' ')}</span>
                        <span>Category: {ticket.category?.replace('_', ' ')}</span>
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
                  Describe your issue or request and we'll help you as soon as possible.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Request Type</Label>
                    <Select
                      value={newTicket.type}
                      onValueChange={(value) => setNewTicket({ ...newTicket, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incident">Incident (Something is broken)</SelectItem>
                        <SelectItem value="service_request">Service Request (I need something)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newTicket.priority}
                      onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_LEVELS.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            <div className="flex flex-col">
                              <span>{priority.label}</span>
                              <span className="text-xs text-gray-500">{priority.description}</span>
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
                    onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {newTicket.type === 'service_request'
                        ? SERVICE_CATEGORIES.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex flex-col">
                                <span>{category.name}</span>
                                <span className="text-xs text-gray-500">{category.description}</span>
                              </div>
                            </SelectItem>
                          ))
                        : INCIDENT_CATEGORIES.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex flex-col">
                                <span>{category.name}</span>
                                <span className="text-xs text-gray-500">{category.description}</span>
                              </div>
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title">Subject</Label>
                  <Input
                    id="title"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                    placeholder="Brief description of your issue or request"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
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
                        type: "incident"
                      });
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleCreateTicket}
                    disabled={loading || !newTicket.title || !newTicket.description || !newTicket.category}
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
  );
}
