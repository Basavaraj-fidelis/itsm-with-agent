import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wrench,
  RefreshCw,
  Ticket,
  BarChart3,
  TrendingUp,
  Activity,
  MessageSquare,
  FileText,
  Target,
  Zap,
  GitBranch,
  ChevronUp,
  ChevronDown,
  Settings,
  Download,
  Eye
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import ServiceDeskSidebar from "@/components/layout/service-desk-sidebar";

const priorityColors = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusColors = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  assigned:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  in_progress:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  pending:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const typeIcons = {
  request: Ticket,
  incident: AlertTriangle,
  problem: Wrench,
  change: RefreshCw,
};

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
}

interface TicketData {
  id: string;
  ticket_number: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  requester_email: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  category?: string;
  sla_policy?: string;
  sla_breached?: boolean;
  sla_response_time?: number;
  sla_resolution_time?: number;
  workflow_step?: number;
}

export default function Tickets() {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [viewMode, setViewMode] = useState<
    "tickets" | "workflows" | "analytics"
  >("tickets");
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [showEditTicketDialog, setShowEditTicketDialog] = useState(false);
  const [showAddCommentDialog, setShowAddCommentDialog] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [newTicketData, setNewTicketData] = useState<NewTicketFormData>({
    type: "request",
    title: "",
    description: "",
    priority: "medium",
    requester_email: "",
    category: "",
    impact: "medium",
    urgency: "medium",
  });

  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalTickets, setTotalTickets] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedTickets, setExpandedTickets] = useState<string[]>([]);
  const [slaViolationFilter, setSlaViolationFilter] = useState(false);

  const [showClosed, setShowClosed] = useState(false);

  // Handle URL filter parameters
  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const filterParam = searchParams.get('filter');

    if (filterParam === 'sla_violated') {
      setSlaViolationFilter(true);
      setActiveTab("overview");
      toast({
        title: "SLA Violated Tickets",
        description: "Showing tickets that have breached their SLA",
        variant: "destructive",
      });
    } else {
      setSlaViolationFilter(false);
    }
  }, [location, toast]);

  // Fetch tickets from API
  const fetchTickets = async (page = 1) => {
    setLoading(true);
    try {
      console.log("Fetching tickets...");

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "100", // Increased limit to show more tickets
      });

      // Only add filter params if they're not "all"
      if (selectedType && selectedType !== "all")
        params.append("type", selectedType);
      if (selectedStatus && selectedStatus !== "all")
        params.append("status", selectedStatus);
      if (selectedPriority && selectedPriority !== "all")
        params.append("priority", selectedPriority);
      if (searchTerm && searchTerm.trim())
        params.append("search", searchTerm.trim());

      console.log("API URL:", `/api/tickets?${params}`);

      const response = await fetch(`/api/tickets?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Received data:", data);

      // Handle both array and paginated response formats
      if (Array.isArray(data)) {
        console.log("Data is array, setting tickets:", data.length);
        setTickets(data);
        setTotalTickets(data.length);
        setCurrentPage(1);
        setTotalPages(1);
      } else if (data.data) {
        // Paginated response
        console.log("Data is paginated, setting tickets:", data.data?.length || 0);
        setTickets(data.data || []);
        setTotalTickets(data.total || 0);
        setCurrentPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
      } else {
        // Direct ticket array response
        console.log("Data is direct object, setting tickets:", Object.keys(data).length);
        setTickets(data || []);
        setTotalTickets((data || []).length);
        setCurrentPage(1);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to fetch tickets. Please check your connection.",
        variant: "destructive",
      });
      setTickets([]);
      setTotalTickets(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadTickets = async () => {
      try {
        await fetchTickets(1);
      } catch (error) {
        console.error("Error in tickets useEffect:", error);
        toast({
          title: "Error",
          description: "Failed to load tickets. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    loadTickets();
  }, [selectedType, selectedStatus, selectedPriority, searchTerm]);

  // Filter and sort tickets - active tickets first, then by updated_at desc
  const filteredTickets = tickets.sort((a, b) => {
    // First sort by status priority (active statuses first)
    const activeStatuses = ["new", "assigned", "in_progress", "pending"];
    const aIsActive = activeStatuses.includes(a.status);
    const bIsActive = activeStatuses.includes(b.status);

    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;

    // Then sort by updated_at (most recent first)
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const handleCreateTicket = async () => {
    if (
      !newTicketData.title ||
      !newTicketData.description ||
      !newTicketData.requester_email
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate workflow-specific fields
    if (newTicketData.type === "change" && !newTicketData.change_type) {
      toast({
        title: "Validation Error",
        description: "Change type is required for change requests",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Set initial status based on workflow
      // const ticketData = {
      //   ...newTicketData,
      //   status: getInitialStatus(newTicketData.type),
      //   workflow_step: 1,
      //   workflow_stage: getInitialStage(newTicketData.type)
      // };

      const response = await api.post("/api/tickets", newTicketData);

      if (response.ok) {
        const newTicket = await response.json();
        setTickets((prev) => [newTicket, ...prev]);
        setShowNewTicketDialog(false);
        setNewTicketData({
          type: "request",
          title: "",
          description: "",
          priority: "medium",
          requester_email: "",
          category: "",
        });
        toast({
          title: "Success",
          description: `Ticket ${newTicket.ticket_number} created successfully`,
        });
        fetchTickets(currentPage); // Refresh the list
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to create ticket");
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (
    ticketId: string,
    newStatus: string,
    comment?: string,
  ) => {
    try {
      const updateData: any = { status: newStatus };
      if (comment && comment.trim()) {
        updateData.comment = comment.trim();
      }

      const response = await api.put(`/api/tickets/${ticketId}`, updateData);

      if (response.ok) {
        const updatedTicket = await response.json();
        setTickets((prev) =>
          prev.map((ticket) =>
            ticket.id === ticketId ? updatedTicket : ticket,
          ),
        );
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(updatedTicket);
        }
        toast({
          title: "Success",
          description: `Ticket status updated to ${newStatus.replace("_", " ")}`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update ticket status",
        variant: "destructive",
      });
    }
  };

  const handleEditTicket = () => {
    if (selectedTicket) {
      setNewTicketData({
        type: selectedTicket.type,
        title: selectedTicket.title,
        description: selectedTicket.description,
        priority: selectedTicket.priority,
        requester_email: selectedTicket.requester_email,
        category: selectedTicket.category || "",
      });
      setShowEditTicketDialog(true);
    }
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;

    try {
      const response = await api.put(
        `/api/tickets/${selectedTicket.id}`,
        newTicketData,
      );

      if (response.ok) {
        const updatedTicket = await response.json();
        setTickets((prev) =>
          prev.map((ticket) =>
            ticket.id === selectedTicket.id ? updatedTicket : ticket,
          ),
        );
        setSelectedTicket(updatedTicket);
        setShowEditTicketDialog(false);
        toast({
          title: "Success",
          description: "Ticket updated successfully",
        });
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async () => {
    if (!selectedTicket || !newCommentText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await api.post(
        `/api/tickets/${selectedTicket.id}/comments`,
        {
          comment: newCommentText,
          author_email: "admin@company.com", // You might want to get this from auth context
          is_internal: false,
        },
      );

      if (response.ok) {
        setNewCommentText("");
        setShowAddCommentDialog(false);
        toast({
          title: "Success",
          description: "Comment added successfully",
        });
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate analytics data
  const getTicketsByType = () => {
    const typeCounts = tickets.reduce(
      (acc, ticket) => {
        acc[ticket.type] = (acc[ticket.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(typeCounts).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      color:
        type === "incident"
          ? "#ef4444"
          : type === "problem"
            ? "#f97316"
            : type === "change"
              ? "#3b82f6"
              : "#10b981",
    }));
  };

  const getTicketsByStatus = () => {
    const statusCounts = tickets.reduce(
      (acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status
        .replace("_", " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      value: count,
    }));
  };

  const getTicketsByPriority = () => {
    const priorityCounts = tickets.reduce(
      (acc, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(priorityCounts).map(([priority, count]) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      value: count,
      color:
        priority === "critical"
          ? "#ef4444"
          : priority === "high"
            ? "#f97316"
            : priority === "medium"
              ? "#eab308"
              : "#3b82f6",
    }));
  };

  const getSLAMetrics = () => {
    const now = new Date();
    const openTickets = tickets.filter(
      (t) => !["resolved", "closed", "cancelled"].includes(t.status),
    );

    let breached = 0;
    let dueIn2Hours = 0;
    let dueToday = 0;
    let onTrack = 0;

    openTickets.forEach((ticket) => {
      // Use sla_resolution_due instead of due_date for consistency
      const slaDate = ticket.sla_resolution_due || ticket.due_date;
      if (!slaDate) {
        onTrack++;
        return;
      }

      const timeDiff = new Date(slaDate).getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 3600);

      if (hoursDiff < 0) {
        breached++;
      } else if (hoursDiff <= 2) {
        dueIn2Hours++;
      } else if (hoursDiff <= 24) {
        dueToday++;
      } else {
        onTrack++;
      }
    });

    const totalSLATickets = openTickets.length;
    const compliance = totalSLATickets > 0 ? Math.round(((totalSLATickets - breached) / totalSLATickets) * 100) : 100;

    return {
      totalOpen: openTickets.length,
      slaViolations: breached,
      dueIn2Hours,
      dueToday,
      onTrack,
      slaCompliance: compliance,
    };
  };

  const getStatusDistribution = () => {
    const statusCounts = tickets.reduce(
      (acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return statusCounts;
  };

  const renderWorkflowActions = (ticket: TicketData) => {
    const actions = [];

    switch (ticket.status) {
      case "new":
        actions.push(
          <Button
            key="assign"
            variant="default"
            size="sm"
            onClick={() => handleUpdateTicketStatus(ticket.id, "assigned")}
          >
            Assign to Self
          </Button>,
        );
        // Only show in_progress if ticket will be assigned
        if (ticket.assigned_to) {
          actions.push(
            <Button
              key="in_progress"
              variant="outline"
              size="sm"
              onClick={() => handleUpdateTicketStatus(ticket.id, "in_progress")}
            >
              Mark as In Progress
            </Button>,
          );
        }
        break;
      case "assigned":
        actions.push(
          <Button
            key="in_progress"
            variant="default"
            size="sm"
            onClick={() => handleUpdateTicketStatus(ticket.id, "in_progress")}
          >
            Mark as In Progress
          </Button>,
        );
        break;
      case "in_progress":
        // Only show these actions if ticket is assigned
        if (ticket.assigned_to) {
          actions.push(
            <Button
              key="pending"
              variant="outline"
              size="sm"
              onClick={() => handleUpdateTicketStatus(ticket.id, "pending")}
            >
              Mark as Pending
            </Button>,
          );
          actions.push(
            <Button
              key="resolved"
              variant="default"
              size="sm"
              onClick={() => handleUpdateTicketStatus(ticket.id, "resolved")}
            >
              Mark as Resolved
            </Button>,
          );
        }
        break;
      case "pending":
        actions.push(
          <Button
            key="in_progress"
            variant="outline"
            size="sm"
            onClick={() => handleUpdateTicketStatus(ticket.id, "in_progress")}
          >
            Mark as In Progress
          </Button>,
        );
        break;
      case "resolved":
        actions.push(
          <Button
            key="closed"
            variant="default"
            size="sm"
            onClick={() => handleUpdateTicketStatus(ticket.id, "closed")}
          >
            Close Ticket
          </Button>,
        );
        break;
      default:
        break;
    }

    return actions;
  };

  // Calculate ticket metrics
  const ticketMetrics = {
    total: tickets.length,
    open: tickets.filter(
      (t) => !["resolved", "closed", "cancelled"].includes(t.status),
    ).length,
    resolved: tickets.filter((t) => ["resolved", "closed"].includes(t.status))
      .length,
    critical: tickets.filter(
      (t) =>
        t.priority === "critical" &&
        !["resolved", "closed", "cancelled"].includes(t.status),
    ).length,
  };

  const slaMetrics = getSLAMetrics();
  const statusDistribution = getStatusDistribution();

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case "overview":
        return "Service Desk Overview";
      case "requests":
        return "Service Requests";
      case "incidents":
        return "Incidents";
      case "problems":
        return "Problems";
      case "changes":
        return "Changes";
      case "analytics":
        return "Analytics";
      default:
        return "Service Desk";
    }
  };

  const getActiveTabDescription = () => {
    switch (activeTab) {
      case "overview":
        return "Dashboard and quick actions";
      case "requests":
        return "Software, hardware, and access requests";
      case "incidents":
        return "Service interruptions and outages";
      case "problems":
        return "Root cause analysis and known errors";
      case "changes":
        return "Change requests and approvals";
      case "analytics":
        return "Performance metrics and reports";
      default:
        return "IT Service Management";
    }
  };

  const getFilteredTickets = () => {
    let filtered = tickets;

    switch (activeTab) {
      case "requests":
        filtered = tickets.filter((t) => t.type === "request");
        break;
      case "incidents":
        filtered = tickets.filter((t) => t.type === "incident");
        break;
      case "problems":
        filtered = tickets.filter((t) => t.type === "problem");
        break;
      case "changes":
        filtered = tickets.filter((t) => t.type === "change");
        break;
      default:
        filtered = tickets;
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter(
        (ticket) => ticket.priority === priorityFilter,
      );
    }

     // Handle SLA violation filter
     if (slaViolationFilter) {
      const now = new Date();
      filtered = filtered.filter(ticket => {
        if (["resolved", "closed", "cancelled"].includes(ticket.status)) return false;
        const slaDate = ticket.sla_resolution_due || ticket.due_date;
        const isBreached = slaDate && new Date(slaDate) < now;
        return ticket.sla_breached || isBreached;
      });
    }

    return filtered;
  };

  const getStatusCountsByType = () => {
    const typeData = {
      request: { name: 'Service Requests', icon: Ticket, color: 'green', statuses: {} },
      incident: { name: 'Incidents', icon: AlertTriangle, color: 'red', statuses: {} },
      problem: { name: 'Problems', icon: Wrench, color: 'orange', statuses: {} },
      change: { name: 'Changes', icon: RefreshCw, color: 'blue', statuses: {} }
    };

    tickets.forEach(ticket => {
      if (!typeData[ticket.type]) return;
      typeData[ticket.type].statuses[ticket.status] = (typeData[ticket.type].statuses[ticket.status] || 0) + 1;
    });

    return typeData;
  };

  const renderQuickStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card 
        className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 cursor-pointer hover:shadow-lg transition-all duration-200"
        onClick={() => {
          setSelectedStatus("all");
          setSelectedType("all");
          setSelectedPriority("all");
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Total Tickets
              </p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {ticketMetrics.total}
              </p>
            </div>
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </CardContent>
      </Card>

      <Card 
        className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 cursor-pointer hover:shadow-lg transition-all duration-200"
        onClick={() => {
          setSelectedStatus("all");
          setSelectedType("all");
          setSelectedPriority("all");
          // Filter to show only open tickets
          setStatusFilter("all");
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Open Tickets
              </p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                {slaMetrics.totalOpen}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </CardContent>
      </Card>

      <Card
        className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 cursor-pointer hover:shadow-lg transition-all duration-200"
        onClick={() => {
          // Redirect to tickets page with SLA violation filter
          setLocation("/tickets?filter=sla_violated");
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                SLA Violations
              </p>
              <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                {slaMetrics.slaViolations}
              </p>
            </div>
            <Clock className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </CardContent>
      </Card>

      <Card 
        className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 cursor-pointer hover:shadow-lg transition-all duration-200"
        onClick={() => {
          toast({
            title: "SLA Compliance",
            description: `Current compliance rate: ${slaMetrics.slaCompliance}%`,
          });
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                SLA Compliance
              </p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {slaMetrics.slaCompliance}%
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
  const clearAllFilters = () => {
    setSelectedStatus("all");
    setSelectedType("all");
    setSelectedPriority("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setSearchTerm("");
  };

  const renderStatusCards = () => {
    const statusCounts = getStatusCountsByType();

    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Ticket Status Overview by Type
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {Object.entries(statusCounts).map(([type, data]) => {
            const IconComponent = data.icon;
            const totalForType = Object.values(data.statuses).reduce((sum: number, count: number) => sum + count, 0);

            return (
              <Card key={type} className={`border-l-4 border-l-${data.color}-500`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <IconComponent className={`w-5 h-5 mr-2 text-${data.color}-600`} />
                    {data.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total: {totalForType} tickets
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {['new', 'assigned', 'in_progress', 'pending', 'resolved', 'closed'].map(status => {
                          const count = data.statuses[status] || 0;
                          if (count === 0) return null;

                          return (
                            <div key={status} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  status === 'new' ? 'bg-blue-500' :
                                  status === 'assigned' ? 'bg-purple-500' :
                                  status === 'in_progress' ? 'bg-yellow-500' :
                                  status === 'pending' ? 'bg-orange-500' :
                                  status === 'resolved' ? 'bg-green-500' :
                                  'bg-gray-500'
                                }`} />
                                <span className="text-sm capitalize text-gray-700 dark:text-gray-300">
                                  {status.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {count}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={`cursor-pointer hover:bg-opacity-80 ${
                                    statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                                  }`}
                                  onClick={() => {
                                    // Clear all filters first
                                    clearAllFilters();
                                    // Set specific filters
                                    setSelectedType(type);
                                    setSelectedStatus(status);
                                    setStatusFilter(status);
                                    // Navigate to the specific tab
                                    if (type === 'request') setActiveTab('requests');
                                    else if (type === 'incident') setActiveTab('incidents');
                                    else if (type === 'problem') setActiveTab('problems');
                                    else if (type === 'change') setActiveTab('changes');
                                  }}
                                >
                                  {Math.round((count / totalForType) * 100)}%
                                </Badge>
                              </div>
                            </div>
                          );
                        })}

                    {totalForType === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No tickets found
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTicketTable = () => {
    const filteredTickets = getFilteredTickets();

    const toggleWorkflow = (ticketId: string) => {
      setExpandedTickets(prev => {
        if (prev.includes(ticketId)) {
          return prev.filter(id => id !== ticketId);
        } else {
          return [...prev, ticketId];
        }
      });
    };

    return (
      <>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
           <Button
                variant={showClosed ? "default" : "outline"}
                size="sm"
                onClick={() => setShowClosed(!showClosed)}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {showClosed ? "Hide Closed" : "Show Closed"}
              </Button>

              <Button
                variant={slaViolationFilter ? "destructive" : "outline"}
                size="sm"
                onClick={() => setSlaViolationFilter(!slaViolationFilter)}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                {slaViolationFilter ? "Clear SLA Filter" : "SLA Violations Only"}
              </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <p className="text-xl font-medium text-neutral-600 mb-2">
                No tickets found
              </p>
              <p className="text-neutral-500">
                Try adjusting your filters or create a new ticket
              </p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const IconComponent =
                typeIcons[ticket.type as keyof typeof typeIcons];
              const isOverdue =
                ticket.due_date && new Date(ticket.due_date) < new Date();
              const isExpanded = expandedTickets.includes(ticket.id);

              return (
                <Card
                  key={ticket.id}
                  className={cn(
                    "cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4",
                    ticket.priority === "critical"
                      ? "border-l-red-500 bg-red-50/50 dark:bg-red-900/10"
                      : ticket.priority === "high"
                        ? "border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10"
                        : ticket.priority === "medium"
                          ? "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10"
                          : "border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10",
                    isOverdue && "ring-2 ring-red-200",
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation(`/tickets/${ticket.id}`);
                  }}
                >
                  <CardContent className="p-6">
                  {/* Compact Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 space-y-2">
                      {/* Priority and Status Badges */}
                      <div className="flex items-center space-x-2 flex-wrap">
                        <Badge className={
                          ticket.type === 'incident' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          ticket.type === 'problem' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          ticket.type === 'change' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }>
                          {ticket.type === 'incident' ? 'INC' :
                           ticket.type === 'problem' ? 'PRO' :
                           ticket.type === 'change' ? 'CHA' : 'SR'}
                        </Badge>
                        <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                          {ticket.priority.toUpperCase()}
                        </Badge>
                        <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                          {ticket.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {(() => {
                          const now = new Date();
                          const slaDate = ticket.sla_resolution_due || ticket.due_date;
                          const isBreached = slaDate && new Date(slaDate) < now && !["resolved", "closed", "cancelled"].includes(ticket.status);

                          if (ticket.sla_breached || isBreached) {
                            return (
                              <Badge variant="destructive" className="animate-pulse">
                                SLA BREACHED
                              </Badge>
                            );
                          }

                          if (slaDate) {
                            const timeDiff = new Date(slaDate).getTime() - now.getTime();
                            const hoursDiff = timeDiff / (1000 * 3600);

                            if (hoursDiff <= 2 && hoursDiff > 0) {
                              return (
                                <Badge variant="destructive" className="bg-orange-500">
                                  DUE IN {Math.round(hoursDiff)}H
                                </Badge>
                              );
                            }
                          }

                          return null;
                        })()}
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-base text-neutral-900 dark:text-neutral-100 line-clamp-1">
                        {ticket.title}
                      </h3>

                      {/* Compact Info Row */}
                      <div className="flex items-center space-x-3 text-xs text-neutral-500 dark:text-neutral-400">
                        <span>#{ticket.ticket_number}</span>
                        <span>•</span>
                        <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                        {ticket.assigned_to && (
                          <>
                            <span>•</span>
                            <span>Assigned: {ticket.assigned_to.split('@')[0]}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className={`font-medium ${(() => {
                          const now = new Date();
                          const slaDate = ticket.sla_resolution_due || ticket.due_date;
                          const isBreached = slaDate && new Date(slaDate) < now && !["resolved", "closed", "cancelled"].includes(ticket.status);
                          return (ticket.sla_breached || isBreached) ? 'text-red-600' : 'text-green-600';
                        })()}`}>
                          {(() => {
                            const now = new Date();
                            const slaDate = ticket.sla_resolution_due || ticket.due_date;
                            const isBreached = slaDate && new Date(slaDate) < now && !["resolved", "closed", "cancelled"].includes(ticket.status);
                            return (ticket.sla_breached || isBreached) ? 'SLA Breached' : 'Within SLA';
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Type Icon and Actions */}
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        ticket.type === 'incident' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                        ticket.type === 'problem' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                        ticket.type === 'change' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        <IconComponent className="w-5 h-5" />
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWorkflow(ticket.id);
                        }}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
                      {/* Description */}
                      <div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {ticket.description}
                        </p>
                      </div>

                      {/* SLA Details */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-neutral-500">SLA Policy: {ticket.sla_policy || 'Standard'}</span>
                          <span className="text-neutral-500">
                            Requester: {ticket.requester_email}
                          </span>
                        </div>
                        {ticket.sla_response_time && (
                          <div className="text-xs text-neutral-400">
                            Response: {Math.floor(ticket.sla_response_time / 60)}h {ticket.sla_response_time % 60}m
                            {ticket.sla_resolution_time && ` • Resolution: ${Math.floor(ticket.sla_resolution_time / 60)}h ${ticket.sla_resolution_time % 60}m`}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-2">
                          {renderWorkflowActions(ticket).slice(0, 2).map((action, index) => (
                            <div key={index}>
                              {action}
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  )}
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTickets(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-neutral-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTickets(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderAnalytics = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Analytics Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Ticket Distribution by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getTicketsByType()}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {getTicketsByType().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend layout="vertical" align="right" verticalAlign="middle" />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getTicketsByStatus()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Priority Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getTicketsByPriority()}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {getTicketsByPriority().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend layout="vertical" align="right" verticalAlign="middle" />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SLA Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Compliance Rate</span>
              <span className="text-2xl font-bold text-green-600">
                {slaMetrics.slaCompliance}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${slaMetrics.slaCompliance}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">On Time</p>
                <p className="text-lg font-semibold">
                  {slaMetrics.totalOpen - slaMetrics.slaViolations}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Violations</p>
                <p className="text-lg font-semibold text-red-600">
                  {slaMetrics.slaViolations}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTypeSpecificStatusCards = (ticketType: string) => {
    const typeData = getStatusCountsByType();
    const data = typeData[ticketType];

    if (!data) return null;

    const IconComponent = data.icon;
    const totalForType = Object.values(data.statuses).reduce((sum: number, count: number) => sum + count, 0);

    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {data.name} Status Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {['new', 'assigned', 'in_progress', 'pending', 'resolved', 'closed'].map(status => {
            const count = data.statuses[status] || 0;

            return (
              <Card key={status} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                setSelectedStatus(status);
              }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'new' ? 'bg-blue-500' :
                      status === 'assigned' ? 'bg-purple-500' :
                      status === 'in_progress' ? 'bg-yellow-500' :
                      status === 'pending' ? 'bg-orange-500' :
                      status === 'resolved' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`} />
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {count}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {status.replace('_', ' ')}
                    </p>
                    {totalForType > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round((count / totalForType) * 100)}%
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {totalForType === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <IconComponent className={`w-12 h-12 mx-auto mb-3 text-${data.color}-400`} />
              <p className="text-gray-500 dark:text-gray-400">
                No {data.name.toLowerCase()} found
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <>
            {renderQuickStats()}
            {renderStatusCards()}
            {renderTicketTable()}
          </>
        );
      case "requests":
        return (
          <>
            {renderTypeSpecificStatusCards('request')}
            {renderTicketTable()}
          </>
        );
      case "incidents":
        return (
          <>
            {renderTypeSpecificStatusCards('incident')}
            {renderTicketTable()}
          </>
        );
      case "problems":
        return (
          <>
            {renderTypeSpecificStatusCards('problem')}
            {renderTicketTable()}
          </>
        );
      case "changes":
        return (
          <>
            {renderTypeSpecificStatusCards('change')}
            {renderTicketTable()}
          </>
        );
      case "analytics":
        return renderAnalytics();
      default:
        return renderTicketTable();
    }
  };
    const getInitialStatus = (type: string) => {
    switch (type) {
      case "request":
        return "new"; // Request Submitted
      case "incident":
        return "new"; // Incident Reported
      case "problem":
        return "new"; // Problem Identification
      case "change":
        return "pending"; // Change Request
      default:
        return "new";
    }
  };

  const getInitialStage = (type: string) => {
    switch (type) {
      case "request":
        return "Request Submitted";
      case "incident":
        return "Incident Reported";
      case "problem":
        return "Problem Identification";
      case "change":
        return "Change Request";
      default:
        return "Submitted";
    }
  };
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <ServiceDeskSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-md p-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
                  {getActiveTabTitle()}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {getActiveTabDescription()}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => setLocation('/create-ticket')}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Ticket</span>
                </Button>

                <Button
                  variant={activeTab === "analytics" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("analytics")}
                  className="flex items-center space-x-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Analytics</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto">
          {renderActiveTabContent()}
        </div>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newTicketData.type}
                  onValueChange={(value) =>
                    setNewTicketData({ ...newTicketData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="request">Service Request</SelectItem>
                    <SelectItem value="incident">Incident</SelectItem>
                    <SelectItem value="problem">Problem</SelectItem>
                    <SelectItem value="change">Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newTicketData.priority}
                  onValueChange={(value) =>
                    setNewTicketData({ ...newTicketData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                value={newTicketData.title}
                onChange={(e) =>
                  setNewTicketData({ ...newTicketData, title: e.target.value })
                }
                placeholder="Brief description of the issue or request"
              />
            </div>
            <div>
              <Label htmlFor="requester_email">Requester Email</Label>
              <Input
                value={newTicketData.requester_email}
                onChange={(e) =>
                  setNewTicketData({
                    ...newTicketData,
                    requester_email: e.target.value,
                  })
                }
                placeholder="user@company.com"
                type="email"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                value={newTicketData.category}
                onChange={(e) =>
                  setNewTicketData({
                    ...newTicketData,
                    category: e.target.value,
                  })
                }
                placeholder="e.g., Hardware, Software, Network"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                value={newTicketData.description}
                onChange={(e) =>
                  setNewTicketData({
                    ...newTicketData,
                    description: e.target.value,
                  })
                }
                placeholder="Detailed description of the issue or request"
                rows={4}
              />
            </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="impact">Impact</Label>
                      <Select
                        value={newTicketData.impact}
                        onValueChange={(value) => setNewTicketData({ ...newTicketData, impact: value })}
                      >
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
                    <div>
                      <Label htmlFor="urgency">Urgency</Label>
                      <Select
                        value={newTicketData.urgency}
                        onValueChange={(value) => setNewTicketData({ ...newTicketData, urgency: value })}
                      >
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

                  {/* Change Management Specific Fields */}
                  {newTicketData.type === "change" && (
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-medium text-sm text-muted-foreground">Change Management Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="change_type">Change Type *</Label>
                          <Select
                            value={newTicketData.change_type}
                            onValueChange={(value) => setNewTicketData({ ...newTicketData, change_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select change type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="emergency">Emergency</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="risk_level">Risk Level</Label>
                          <Select
                            value={newTicketData.risk_level}
                            onValueChange={(value) => setNewTicketData({ ...newTicketData, risk_level: value })}
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
                      </div>
                    </div>
                  )}

                  {/* Problem Management Specific Fields */}
                  {newTicketData.type === "problem" && (
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-medium text-sm text-muted-foreground">Problem Management Details</h4>
                      <div>
                        <Label htmlFor="known_error">Known Error</Label>
                        <Select
                          value={newTicketData.known_error ? "true" : "false"}
                          onValueChange={(value) => setNewTicketData({ ...newTicketData, known_error: value === "true" })}
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
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowNewTicketDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTicket} disabled={loading}>
                {loading ? "Creating..." : "Create Ticket"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Ticket Dialog */}
      <Dialog
        open={showEditTicketDialog}
        onOpenChange={setShowEditTicketDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newTicketData.type}
                  onValueChange={(value) =>
                    setNewTicketData({ ...newTicketData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="request">Service Request</SelectItem>
                    <SelectItem value="incident">Incident</SelectItem>
                    <SelectItem value="problem">Problem</SelectItem>
                    <SelectItem value="change">Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newTicketData.priority}
                  onValueChange={(value) =>
                    setNewTicketData({ ...newTicketData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                value={newTicketData.title}
                onChange={(e) =>
                  setNewTicketData({ ...newTicketData, title: e.target.value })
                }
                placeholder="Brief description of the issue or request"
              />
            </div>
            <div>
              <Label htmlFor="requester_email">Requester Email</Label>
              <Input
                value={newTicketData.requester_email}
                onChange={(e) =>
                  setNewTicketData({
                    ...newTicketData,
                    requester_email: e.target.value,
                  })
                }
                placeholder="user@company.com"
                type="email"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                value={newTicketData.category}
                onChange={(e) =>
                  setNewTicketData({
                    ...newTicketData,
                    category: e.target.value,
                  })
                }
                placeholder="e.g., Hardware, Software, Network"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                value={newTicketData.description}
                onChange={(e) =>
                  setNewTicketData({
                    ...newTicketData,
                    description: e.target.value,
                  })
                }
                placeholder="Detailed description of the issue or request"
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowEditTicketDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateTicket} disabled={loading}>
                {loading ? "Updating..." : "Update Ticket"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Comment Dialog */}
      <Dialog
        open={showAddCommentDialog}
        onOpenChange={setShowAddCommentDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Enter your comment..."
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAddCommentDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddComment}>Add Comment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setLocation('/create-ticket')}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}