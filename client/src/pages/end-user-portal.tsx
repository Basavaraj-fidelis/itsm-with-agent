The code has been modified to fix end user portal routing and authentication, add portal login UI, fix portal functionality, and fix the fetchUserTickets function.

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
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium"
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
                Welcome, {user?.email}
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