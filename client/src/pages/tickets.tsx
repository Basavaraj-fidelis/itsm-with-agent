import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Search, 
  Filter,
  Ticket,
  AlertTriangle,
  Wrench,
  RefreshCw,
  Clock,
  User,
  Calendar,
  MoreVertical,
  X,
  Download,
  Workflow,
  TrendingUp,
  CheckCircle,
  UserCheck,
  FileText
} from "lucide-react";
import ServiceDeskWorkflows from "@/components/tickets/service-desk-workflows";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useToast } from "@/hooks/use-toast";

const priorityColors = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
};

const statusColors = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  assigned: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  pending: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
};

const typeIcons = {
  request: Ticket,
  incident: AlertTriangle,
  problem: Wrench,
  change: RefreshCw
};

interface NewTicketFormData {
  type: string;
  title: string;
  description: string;
  priority: string;
  requester_email: string;
  category: string;
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
}

export default function Tickets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [viewMode, setViewMode] = useState<"tickets" | "workflows" | "analytics">("tickets");
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [showTicketDetailsDialog, setShowTicketDetailsDialog] = useState(false);
  const [showEditTicketDialog, setShowEditTicketDialog] = useState(false);
  const [showAddCommentDialog, setShowAddCommentDialog] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [newTicketData, setNewTicketData] = useState<NewTicketFormData>({
    type: "request",
    title: "",
    description: "",
    priority: "medium",
    requester_email: "",
    category: ""
  });

  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalTickets, setTotalTickets] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");

  // Fetch tickets from API
  const fetchTickets = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "100" // Increased limit to show more tickets
      });

      // Only add filter params if they're not "all"
      if (selectedType && selectedType !== "all") params.append("type", selectedType);
      if (selectedStatus && selectedStatus !== "all") params.append("status", selectedStatus);
      if (selectedPriority && selectedPriority !== "all") params.append("priority", selectedPriority);
      if (searchTerm && searchTerm.trim()) params.append("search", searchTerm.trim());

      const response = await api.get(`/api/tickets?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle both array and paginated response formats
      if (Array.isArray(data)) {
        setTickets(data);
        setTotalTickets(data.length);
        setCurrentPage(1);
        setTotalPages(1);
      } else if (data.data) {
        // Paginated response
        setTickets(data.data || []);
        setTotalTickets(data.total || 0);
        setCurrentPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
      } else {
        // Direct ticket array response
        setTickets(data || []);
        setTotalTickets((data || []).length);
        setCurrentPage(1);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch tickets. Please check your connection.",
        variant: "destructive"
      });
      setTickets([]);
      setTotalTickets(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(1);
  }, [selectedType, selectedStatus, selectedPriority, searchTerm]);

  // Filter and sort tickets - active tickets first, then by updated_at desc
  const filteredTickets = tickets.sort((a, b) => {
    // First sort by status priority (active statuses first)
    const activeStatuses = ['new', 'assigned', 'in_progress', 'pending'];
    const aIsActive = activeStatuses.includes(a.status);
    const bIsActive = activeStatuses.includes(b.status);

    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;

    // Then sort by updated_at (most recent first)
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const handleCreateTicket = async () => {
    if (!newTicketData.title || !newTicketData.description || !newTicketData.requester_email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/tickets', newTicketData);

      if (response.ok) {
        const newTicket = await response.json();
        setTickets(prev => [newTicket, ...prev]);
        setShowNewTicketDialog(false);
        setNewTicketData({
          type: "request",
          title: "",
          description: "",
          priority: "medium",
          requester_email: "",
          category: ""
        });
        toast({
          title: "Success",
          description: `Ticket ${newTicket.ticket_number} created successfully`
        });
        fetchTickets(currentPage); // Refresh the list
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ticket",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const response = await api.put(`/api/tickets/${ticketId}`, { status: newStatus });

      if (response.ok) {
        const updatedTicket = await response.json();
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId ? updatedTicket : ticket
        ));
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(updatedTicket);
        }
        toast({
          title: "Success",
          description: `Ticket status updated to ${newStatus.replace('_', ' ')}`
        });
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive"
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
        category: selectedTicket.category || ""
      });
      setShowEditTicketDialog(true);
    }
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;

    try {
      const response = await api.put(`/api/tickets/${selectedTicket.id}`, newTicketData);

      if (response.ok) {
        const updatedTicket = await response.json();
        setTickets(prev => prev.map(ticket => 
          ticket.id === selectedTicket.id ? updatedTicket : ticket
        ));
        setSelectedTicket(updatedTicket);
        setShowEditTicketDialog(false);
        toast({
          title: "Success",
          description: "Ticket updated successfully"
        });
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive"
      });
    }
  };

  const handleAddComment = async () => {
    if (!selectedTicket || !newCommentText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a comment",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await api.post(`/api/tickets/${selectedTicket.id}/comments`, {
        comment: newCommentText,
        author_email: "admin@company.com", // You might want to get this from auth context
        is_internal: false
      });

      if (response.ok) {
        setNewCommentText("");
        setShowAddCommentDialog(false);
        toast({
          title: "Success",
          description: "Comment added successfully"
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate analytics data
  const getTicketsByType = () => {
    const typeCounts = tickets.reduce((acc, ticket) => {
      acc[ticket.type] = (acc[ticket.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      color: type === 'incident' ? '#ef4444' : 
             type === 'problem' ? '#f97316' : 
             type === 'change' ? '#3b82f6' : '#10b981'
    }));
  };

  const getTicketsByStatus = () => {
    const statusCounts = tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('_', ' ').split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      value: count
    }));
  };

  const getTicketsByPriority = () => {
    const priorityCounts = tickets.reduce((acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(priorityCounts).map(([priority, count]) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      value: count,
      color: priority === 'critical' ? '#ef4444' : 
             priority === 'high' ? '#f97316' : 
             priority === 'medium' ? '#eab308' : '#3b82f6'
    }));
  };

  const getSLAMetrics = () => {
    const openTickets = tickets.filter(t => !['resolved', 'closed', 'cancelled'].includes(t.status));
    const slaViolations = openTickets.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date();
    });

    return {
      totalOpen: openTickets.length,
      slaViolations: slaViolations.length,
      slaCompliance: openTickets.length > 0 ? 
        Math.round(((openTickets.length - slaViolations.length) / openTickets.length) * 100) : 100
    };
  };
  
   const getStatusDistribution = () => {
    const statusCounts = tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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
          </Button>
        );
        actions.push(
          <Button 
            key="in_progress" 
            variant="outline" 
            size="sm"
            onClick={() => handleUpdateTicketStatus(ticket.id, "in_progress")}
          >
            Mark as In Progress
          </Button>
        );
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
          </Button>
        );
        break;
      case "in_progress":
        actions.push(
          <Button 
            key="pending" 
            variant="outline" 
            size="sm"
            onClick={() => handleUpdateTicketStatus(ticket.id, "pending")}
          >
            Mark as Pending
          </Button>
        );
        actions.push(
          <Button 
            key="resolved" 
            variant="default" 
            size="sm"
            onClick={() => handleUpdateTicketStatus(ticket.id, "resolved")}
          >
            Mark as Resolved
          </Button>
        );
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
          </Button>
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
          </Button>
        );
        break;
      default:
        break;
    }

    return actions;
  };

  const slaMetrics = getSLAMetrics();
  const statusDistribution = getStatusDistribution();

  const renderTicketFiltersAndList = (ticketsToShow: TicketData[]) => {
    const filteredTickets = ticketsToShow.filter((ticket) => {
      const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === "all" || ticket.status === selectedStatus;
      const matchesPriority = selectedPriority === "all" || ticket.priority === selectedPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });

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
              <p className="text-xl font-medium text-neutral-600 mb-2">No tickets found</p>
              <p className="text-neutral-500">Try adjusting your filters or create a new ticket</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const IconComponent = typeIcons[ticket.type as keyof typeof typeIcons];
              const isOverdue = ticket.due_date && new Date(ticket.due_date) < new Date();

              return (
                <Card 
                  key={ticket.id} 
                  className={cn(
                    "cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4",
                    ticket.priority === "critical" ? "border-l-red-500 bg-red-50/50 dark:bg-red-900/10" :
                    ticket.priority === "high" ? "border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10" :
                    ticket.priority === "medium" ? "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10" :
                    "border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10",
                    isOverdue && "ring-2 ring-red-200"
                  )}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setShowTicketDetailsDialog(true);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className={cn(
                          "p-3 rounded-xl",
                          ticket.type === 'incident' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                          ticket.type === 'problem' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                          ticket.type === 'change' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        )}>
                          <IconComponent className="w-5 h-5" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="font-mono text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                              {ticket.ticket_number}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={priorityColors[ticket.priority as keyof typeof priorityColors]}
                            >
                              {ticket.priority.toUpperCase()}
                            </Badge>
                            <Badge 
                              variant="outline"
                              className={statusColors[ticket.status as keyof typeof statusColors]}
                            >
                              {ticket.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive" className="animate-pulse">
                                OVERDUE
                              </Badge>
                            )}
                          </div>

                          <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100 mb-2">
                            {ticket.title}
                          </h3>

                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
                            {ticket.description}
                          </p>

                          <div className="flex items-center space-x-6 text-xs text-neutral-500 dark:text-neutral-400">
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>{ticket.requester_email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>Created: {formatDate(ticket.created_at)}</span>
                            </div>
                            {ticket.assigned_to && (
                              <div className="flex items-center space-x-1">
                                <UserCheck className="w-3 h-3" />
                                <span>Assigned: {ticket.assigned_to}</span>
                              </div>
                            )}
                            {ticket.due_date && (
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                                  Due: {formatDate(ticket.due_date)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#201F1E] dark:text-[#F3F2F1] mb-2">
            Service Desk
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Manage tickets, workflows, and service analytics
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "tickets" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("tickets")}
          >
            <Ticket className="w-4 h-4 mr-2" />
            Tickets
          </Button>
          <Button
            variant={viewMode === "workflows" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("workflows")}
          >
            <Workflow className="w-4 h-4 mr-2" />
            Workflows
          </Button>
          <Button
            variant={viewMode === "analytics" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("analytics")}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          {viewMode === "tickets" && (
            <Button onClick={() => setShowNewTicketDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Tickets</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalTickets}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Open Tickets</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">{slaMetrics.totalOpen}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">SLA Violations</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{slaMetrics.slaViolations}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">SLA Compliance</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{slaMetrics.slaCompliance}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>
       {/* Status Distribution */}
       <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        {Object.entries(statusDistribution).map(([status, count]) => (
          <Card key={status} className="bg-gray-50 dark:bg-gray-800 border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{status.replace('_', ' ').toUpperCase()}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
                </div>
                {/* You can add icons based on status here */}}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {viewMode === "workflows" ? (
        <ServiceDeskWorkflows />
      ) : viewMode === "analytics" ? (
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
                  >
                    {getTicketsByType().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
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
                  >
                    {getTicketsByPriority().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
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
                  <span className="text-2xl font-bold text-green-600">{slaMetrics.slaCompliance}%</span>
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
                    <p className="text-lg font-semibold">{slaMetrics.totalOpen - slaMetrics.slaViolations}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Violations</p>
                    <p className="text-lg font-semibold text-red-600">{slaMetrics.slaViolations}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Ticket Type Tabs */}
          <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All Tickets</TabsTrigger>
              <TabsTrigger value="request">Service Requests</TabsTrigger>
              <TabsTrigger value="incident">Incidents</TabsTrigger>
              <TabsTrigger value="problem">Problems</TabsTrigger>
              <TabsTrigger value="change">Changes</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {renderTicketFiltersAndList(tickets)}
            </TabsContent>

            <TabsContent value="request" className="mt-6">
              {renderTicketFiltersAndList(tickets.filter(t => t.type === 'request'))}
            </TabsContent>

            <TabsContent value="incident" className="mt-6">
              {renderTicketFiltersAndList(tickets.filter(t => t.type === 'incident'))}
            </TabsContent>

            <TabsContent value="problem" className="mt-6">
              {renderTicketFiltersAndList(tickets.filter(t => t.type === 'problem'))}
            </TabsContent>

            <TabsContent value="change" className="mt-6">
              {renderTicketFiltersAndList(tickets.filter(t => t.type === 'change'))}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select value={newTicketData.type} onValueChange={(value) => 
                  setNewTicketData(prev => ({ ...prev, type: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="request">Service Request</SelectItem>
                    <SelectItem value="incident">Incident</SelectItem>
                    <SelectItem value="problem">Problem</SelectItem>
                    <SelectItem value="change">Change Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority *</Label>
                <Select value={newTicketData.priority} onValueChange={(value) =>
                  setNewTicketData(prev => ({ ...prev, priority: value }))
                }>
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
              <Label htmlFor="requester">Requester Email *</Label>
              <Input
                id="requester"
                type="email"
                value={newTicketData.requester_email}
                onChange={(e) => setNewTicketData(prev => ({ ...prev, requester_email: e.target.value }))}
                placeholder="user@company.com"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={newTicketData.category}
                onChange={(e) => setNewTicketData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Hardware, Software, Network"
              />
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newTicketData.title}
                onChange={(e) => setNewTicketData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of the request"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={newTicketData.description}
                onChange={(e) => setNewTicketData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the request"
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNewTicketDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTicket} disabled={loading}>
                {loading ? "Creating..." : "Create Ticket"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Details Dialog */}
      <Dialog open={showTicketDetailsDialog} onOpenChange={setShowTicketDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="font-mono text-xl font-bold text-blue-600">
                      {selectedTicket.ticket_number}
                    </span>
                    <Badge className={priorityColors[selectedTicket.priority as keyof typeof priorityColors]}>
                      {selectedTicket.priority.toUpperCase()}
                    </Badge>
                    <Badge className={statusColors[selectedTicket.status as keyof typeof statusColors]}>
                      {selectedTicket.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-bold mb-3">{selectedTicket.title}</h2>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">{selectedTicket.description}</p>
                </div>
                <div className="flex space-x-2">
                  {renderWorkflowActions(selectedTicket)}
                  <Button variant="outline" size="sm" onClick={handleEditTicket}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAddCommentDialog(true)}>
                    Add Comment
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Ticket Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        <p className="font-medium">{selectedTicket.type}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Priority</Label>
                        <p className="font-medium">{selectedTicket.priority}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <p className="font-medium">{selectedTicket.status}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <p className="font-medium">{selectedTicket.category || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assignment & Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Requester</Label>
                        <p className="font-medium">{selectedTicket.requester_email}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Assigned To</Label>
                        <p className="font-medium">{selectedTicket.assigned_to || 'Unassigned'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Created</Label>
                        <p className="font-medium">{formatDate(selectedTicket.created_at)}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Last Updated</Label>
                        <p className="font-medium">{formatDate(selectedTicket.updated_at)}</p>
                      </div>
                      {selectedTicket.due_date && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Due Date</Label>
                          <p className="font-medium">{formatDate(selectedTicket.due_date)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Ticket Dialog */}
      <Dialog open={showEditTicketDialog} onOpenChange={setShowEditTicketDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-type">Type *</Label>
                <Select value={newTicketData.type} onValueChange={(value) => 
                  setNewTicketData(prev => ({ ...prev, type: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="request">Service Request</SelectItem>
                    <SelectItem value="incident">Incident</SelectItem>
                    <SelectItem value="problem">Problem</SelectItem>
                    <SelectItem value="change">Change Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-priority">Priority *</Label>
                <Select value={newTicketData.priority} onValueChange={(value) =>
                  setNewTicketData(prev => ({ ...prev, priority: value }))
                }>
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
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={newTicketData.title}
                onChange={(e) => setNewTicketData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of the request"
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={newTicketData.description}
                onChange={(e) => setNewTicketData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the request"
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditTicketDialog(false)}>
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
      <Dialog open={showAddCommentDialog} onOpenChange={setShowAddCommentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="comment">Comment *</Label>
              <Textarea
                id="comment"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Enter your comment..."
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowAddCommentDialog(false);
                setNewCommentText("");
              }}>
                Cancel
              </Button>
              <Button onClick={handleAddComment} disabled={loading}>
                {loading ? "Adding..." : "Add Comment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}