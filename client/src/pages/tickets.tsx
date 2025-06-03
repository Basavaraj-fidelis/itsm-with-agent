
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
  Workflow
} from "lucide-react";
import ServiceDeskWorkflows from "@/components/tickets/service-desk-workflows";

// Mock ticket data
const mockTickets = [
  {
    id: "1",
    ticket_number: "REQ-2024-001",
    type: "request",
    title: "New Software Installation Request",
    description: "Request to install Microsoft Office 365 on workstation",
    priority: "medium",
    status: "new",
    requester_email: "john.doe@company.com",
    assigned_to: "it-support@company.com",
    created_at: "2024-01-15T10:30:00Z",
    due_date: "2024-01-20T17:00:00Z"
  },
  {
    id: "2",
    ticket_number: "INC-2024-001",
    type: "incident",
    title: "Email Server Down",
    description: "Users unable to access email services",
    priority: "critical",
    status: "in_progress",
    requester_email: "jane.smith@company.com",
    assigned_to: "network-team@company.com",
    created_at: "2024-01-15T08:15:00Z",
    due_date: "2024-01-15T12:00:00Z"
  },
  {
    id: "3",
    ticket_number: "PRB-2024-001",
    type: "problem",
    title: "Recurring Network Timeouts",
    description: "Multiple incidents of network connectivity issues",
    priority: "high",
    status: "assigned",
    requester_email: "system@company.com",
    assigned_to: "senior-engineer@company.com",
    created_at: "2024-01-14T14:20:00Z"
  },
  {
    id: "4",
    ticket_number: "CHG-2024-001",
    type: "change",
    title: "Server OS Update",
    description: "Scheduled update of production servers to latest OS version",
    priority: "medium",
    status: "pending",
    requester_email: "system-admin@company.com",
    assigned_to: "change-team@company.com",
    created_at: "2024-01-13T16:45:00Z",
    scheduled_start: "2024-01-20T02:00:00Z",
    scheduled_end: "2024-01-20T06:00:00Z"
  }
];

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

export default function Tickets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [viewMode, setViewMode] = useState<"tickets" | "workflows">("tickets");
  const [activeTab, setActiveTab] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [showTicketDetailsDialog, setShowTicketDetailsDialog] = useState(false);
  const [newTicketData, setNewTicketData] = useState<NewTicketFormData>({
    type: "request",
    title: "",
    description: "",
    priority: "medium",
    requester_email: "",
    category: ""
  });

  const [tickets, setTickets] = useState(mockTickets);
  const [loading, setLoading] = useState(false);

  // Filter tickets based on current filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.requester_email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === "all" || ticket.type === selectedType;
    const matchesStatus = selectedStatus === "all" || ticket.status === selectedStatus;
    const matchesPriority = selectedPriority === "all" || ticket.priority === selectedPriority;

    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

  const handleCreateTicket = async () => {
    if (!newTicketData.title || !newTicketData.description || !newTicketData.requester_email) {
      return;
    }

    setLoading(true);
    try {
      // Create new ticket
      const newTicket = {
        id: (tickets.length + 1).toString(),
        ticket_number: `${newTicketData.type.toUpperCase().slice(0, 3)}-2024-${String(tickets.length + 1).padStart(3, '0')}`,
        ...newTicketData,
        status: "new",
        created_at: new Date().toISOString(),
        assigned_to: null
      };

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
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
            Service Desk
          </h1>
          <p className="text-neutral-600">Manage tickets and service workflows</p>
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
          {viewMode === "tickets" && (
            <Button onClick={() => setShowNewTicketDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
            </Button>
          )}
        </div>
      </div>

      {viewMode === "workflows" ? (
        <ServiceDeskWorkflows />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-neutral-500" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="request">Request</SelectItem>
                <SelectItem value="incident">Incident</SelectItem>
                <SelectItem value="problem">Problem</SelectItem>
                <SelectItem value="change">Change</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
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
              <SelectTrigger className="w-32">
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
          </div>

          {/* Tickets List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-neutral-600">Loading tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8">
                <Ticket className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                <p className="text-neutral-600">No tickets found</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const IconComponent = typeIcons[ticket.type as keyof typeof typeIcons];
                return (
                  <Card 
                    key={ticket.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setShowTicketDetailsDialog(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className={`p-2 rounded-lg ${
                            ticket.type === 'incident' ? 'bg-red-100 text-red-600' :
                            ticket.type === 'problem' ? 'bg-orange-100 text-orange-600' :
                            ticket.type === 'change' ? 'bg-blue-100 text-blue-600' :
                            'bg-green-100 text-green-600'
                          }`}>
                            <IconComponent className="w-4 h-4" />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-mono text-sm text-neutral-600">
                                {ticket.ticket_number}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={priorityColors[ticket.priority as keyof typeof priorityColors]}
                              >
                                {ticket.priority}
                              </Badge>
                              <Badge 
                                variant="outline"
                                className={statusColors[ticket.status as keyof typeof statusColors]}
                              >
                                {ticket.status.replace('_', ' ')}
                              </Badge>
                            </div>

                            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                              {ticket.title}
                            </h3>

                            <p className="text-sm text-neutral-600 mb-2 line-clamp-2">
                              {ticket.description}
                            </p>

                            <div className="flex items-center space-x-4 text-xs text-neutral-500">
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>{ticket.requester_email}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(ticket.created_at)}</span>
                              </div>
                              {ticket.due_date && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Due: {formatDate(ticket.due_date)}</span>
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
          </div>
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
                <Label htmlFor="type">Type</Label>
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
                <Label htmlFor="priority">Priority</Label>
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
              <Label htmlFor="requester">Requester Email</Label>
              <Input
                id="requester"
                type="email"
                value={newTicketData.requester_email}
                onChange={(e) => setNewTicketData(prev => ({ ...prev, requester_email: e.target.value }))}
                placeholder="user@company.com"
              />
            </div>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newTicketData.title}
                onChange={(e) => setNewTicketData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of the request"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-mono text-lg font-semibold">
                      {selectedTicket.ticket_number}
                    </span>
                    <Badge className={priorityColors[selectedTicket.priority as keyof typeof priorityColors]}>
                      {selectedTicket.priority}
                    </Badge>
                    <Badge className={statusColors[selectedTicket.status as keyof typeof statusColors]}>
                      {selectedTicket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-semibold mb-2">{selectedTicket.title}</h2>
                  <p className="text-neutral-600">{selectedTicket.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Ticket Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Type:</strong> {selectedTicket.type}</div>
                    <div><strong>Priority:</strong> {selectedTicket.priority}</div>
                    <div><strong>Status:</strong> {selectedTicket.status}</div>
                    <div><strong>Requester:</strong> {selectedTicket.requester_email}</div>
                    <div><strong>Created:</strong> {formatDate(selectedTicket.created_at)}</div>
                    {selectedTicket.due_date && (
                      <div><strong>Due Date:</strong> {formatDate(selectedTicket.due_date)}</div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Assignment</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Assigned To:</strong> {selectedTicket.assigned_to || 'Unassigned'}</div>
                    {selectedTicket.scheduled_start && (
                      <div><strong>Scheduled Start:</strong> {formatDate(selectedTicket.scheduled_start)}</div>
                    )}
                    {selectedTicket.scheduled_end && (
                      <div><strong>Scheduled End:</strong> {formatDate(selectedTicket.scheduled_end)}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
