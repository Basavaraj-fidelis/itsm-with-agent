
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

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const response = await api.get("/tickets");
        if (response.data && response.data.length > 0) {
          setTickets(response.data);
        } else {
          // Use mock data if no real tickets exist
          setTickets(mockTickets);
        }
      } catch (error) {
        console.error("Failed to fetch tickets:", error);
        // Use mock data on error
        setTickets(mockTickets);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const handleNewTicket = () => {
    const ticketType = activeTab === "all" ? "request" : activeTab;
    setNewTicketData({ ...newTicketData, type: ticketType });
    setShowNewTicketDialog(true);
  };

  const handleViewTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setShowTicketDetailsDialog(true);
  };

  const handleCreateTicket = async () => {
    try {
      await api.post("/tickets", newTicketData);
      // Refresh tickets after creating a new one
      const response = await api.get("/tickets");
      setTickets(response.data);
      setShowNewTicketDialog(false);
    } catch (error) {
      console.error("Failed to create ticket:", error);
      // Handle error appropriately
    }
    // Here you would normally send the data to your API
    console.log("Creating ticket:", newTicketData);
    setShowNewTicketDialog(false);
    // Reset form
    setNewTicketData({
      type: "request",
      title: "",
      description: "",
      priority: "medium",
      requester_email: "",
      category: ""
    });
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesTab = activeTab === "all" || ticket.type === activeTab;
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === "all" || ticket.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || ticket.status === filterStatus;

    return matchesTab && matchesSearch && matchesPriority && matchesStatus;
  });

  const ticketCounts = {
    all: tickets.length,
    request: tickets.filter(t => t.type === "request").length,
    incident: tickets.filter(t => t.type === "incident").length,
    problem: tickets.filter(t => t.type === "problem").length,
    change: tickets.filter(t => t.type === "change").length
  };

  const handleExportCSV = () => {
    // Implement CSV export logic here
    console.log("Exporting CSV...");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
            Service Desk
          </h1>
          <p className="text-neutral-600">Manage requests, incidents, problems, and changes</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "tickets" ? "default" : "outline"}
            onClick={() => setViewMode("tickets")}
          >
            Tickets
          </Button>
          <Button
            variant={viewMode === "workflows" ? "default" : "outline"}
            onClick={() => setViewMode("workflows")}
          >
            <Workflow className="w-4 h-4 mr-2" />
            Workflows
          </Button>
          <Button onClick={handleNewTicket} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>New Ticket</span>
          </Button>
        </div>
      </div>

      {/* Conditional Content Based on View Mode */}
      {viewMode === "workflows" ? (
        <ServiceDeskWorkflows />
      ) : (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-40">
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
              </div>
            </CardContent>
          </Card>

          {/* Tickets Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({ticketCounts.all})
              </TabsTrigger>
              <TabsTrigger value="request">
                Requests ({ticketCounts.request})
              </TabsTrigger>
              <TabsTrigger value="incident">
                Incidents ({ticketCounts.incident})
              </TabsTrigger>
              <TabsTrigger value="problem">
                Problems ({ticketCounts.problem})
              </TabsTrigger>
              <TabsTrigger value="change">
                Changes ({ticketCounts.change})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading tickets...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8">No tickets found</div>
              ) : (
                filteredTickets.map((ticket) => {
                  const TypeIcon = typeIcons[ticket.type as keyof typeof typeIcons];
                  return (
                    <Card 
                      key={ticket.id} 
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                      onClick={() => handleViewTicket(ticket)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <TypeIcon className="w-5 h-5 text-neutral-600 mt-1" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="font-mono text-sm text-neutral-600">
                                  {ticket.ticket_number}
                                </span>
                                <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                                  {ticket.priority}
                                </Badge>
                                <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                                  {ticket.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                                {ticket.title}
                              </h3>
                              <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                                {ticket.description}
                              </p>
                              <div className="flex items-center space-x-4 text-xs text-neutral-500">
                                <div className="flex items-center space-x-1">
                                  <User className="w-3 h-3" />
                                  <span>{ticket.requester_email}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                </div>
                                {ticket.due_date && (
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>Due: {new Date(ticket.due_date).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New {newTicketData.type.charAt(0).toUpperCase() + newTicketData.type.slice(1)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={newTicketData.type} onValueChange={(value) => setNewTicketData({...newTicketData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="request">Request</SelectItem>
                    <SelectItem value="incident">Incident</SelectItem>
                    <SelectItem value="problem">Problem</SelectItem>
                    <SelectItem value="change">Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newTicketData.priority} onValueChange={(value) => setNewTicketData({...newTicketData, priority: value})}>
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
                id="title"
                value={newTicketData.title}
                onChange={(e) => setNewTicketData({...newTicketData, title: e.target.value})}
                placeholder="Enter ticket title"
              />
            </div>

            <div>
              <Label htmlFor="requester_email">Requester Email</Label>
              <Input
                id="requester_email"
                type="email"
                value={newTicketData.requester_email}
                onChange={(e) => setNewTicketData({...newTicketData, requester_email: e.target.value})}
                placeholder="requester@company.com"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={newTicketData.category}
                onChange={(e) => setNewTicketData({...newTicketData, category: e.target.value})}
                placeholder="e.g., Software, Hardware, Network"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTicketData.description}
                onChange={(e) => setNewTicketData({...newTicketData, description: e.target.value})}
                placeholder="Provide detailed description of the issue or request"
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNewTicketDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTicket}>
                Create Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Details Dialog */}
      <Dialog open={showTicketDetailsDialog} onOpenChange={setShowTicketDetailsDialog}>
        <DialogContent className="max-w-3xl">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center space-x-2">
                    <span>{selectedTicket.ticket_number}</span>
                    <Badge className={priorityColors[selectedTicket.priority as keyof typeof priorityColors]}>
                      {selectedTicket.priority}
                    </Badge>
                    <Badge className={statusColors[selectedTicket.status as keyof typeof statusColors]}>
                      {selectedTicket.status.replace('_', ' ')}
                    </Badge>
                  </DialogTitle>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{selectedTicket.title}</h3>
                  <p className="text-neutral-600">{selectedTicket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-neutral-500">Requester</Label>
                      <p className="text-sm">{selectedTicket.requester_email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-neutral-500">Assigned To</Label>
                      <p className="text-sm">{selectedTicket.assigned_to}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-neutral-500">Type</Label>
                      <p className="text-sm capitalize">{selectedTicket.type}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-neutral-500">Created</Label>
                      <p className="text-sm">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                    </div>
                    {selectedTicket.due_date && (
                      <div>
                        <Label className="text-sm font-medium text-neutral-500">Due Date</Label>
                        <p className="text-sm">{new Date(selectedTicket.due_date).toLocaleString()}</p>
                      </div>
                    )}
                    {selectedTicket.scheduled_start && (
                      <div>
                        <Label className="text-sm font-medium text-neutral-500">Scheduled Start</Label>
                        <p className="text-sm">{new Date(selectedTicket.scheduled_start).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowTicketDetailsDialog(false)}>
                    Close
                  </Button>
                  <Button>
                    Update Ticket
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Ticket {
  id: string
  title: string
  description: string
  status: string
  priority: string
  created_at: string
}

export default function Tickets() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium'
  })

  const queryClient = useQueryClient()

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ['tickets', statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter)
      }
      
      const response = await fetch(`/api/tickets?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tickets')
      }
      return response.json()
    }
  })

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: typeof newTicket) => {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      })
      if (!response.ok) {
        throw new Error('Failed to create ticket')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setIsCreateModalOpen(false)
      setNewTicket({ title: '', description: '', priority: 'medium' })
    }
  })

  const handleCreateTicket = () => {
    createTicketMutation.mutate(newTicket)
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tickets</h1>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>Create Ticket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newTicket.priority} onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger aria-label="Priority">
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
              <Button onClick={handleCreateTicket} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex gap-4 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32" aria-label="Status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32" aria-label="Priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {tickets?.map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader>
              <CardTitle>{ticket.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Status:</span>
                  <div>{ticket.status}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Priority:</span>
                  <div>{ticket.priority}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Created:</span>
                  <div>{new Date(ticket.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
