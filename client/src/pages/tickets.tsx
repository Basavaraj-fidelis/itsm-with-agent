import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  MoreVertical
} from "lucide-react";

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

export default function Tickets() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredTickets = mockTickets.filter(ticket => {
    const matchesTab = activeTab === "all" || ticket.type === activeTab;
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === "all" || ticket.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || ticket.status === filterStatus;

    return matchesTab && matchesSearch && matchesPriority && matchesStatus;
  });

  const ticketCounts = {
    all: mockTickets.length,
    request: mockTickets.filter(t => t.type === "request").length,
    incident: mockTickets.filter(t => t.type === "incident").length,
    problem: mockTickets.filter(t => t.type === "problem").length,
    change: mockTickets.filter(t => t.type === "change").length
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
        <Button className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </Button>
      </div>

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
          {filteredTickets.length > 0 ? (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => {
                const TypeIcon = typeIcons[ticket.type as keyof typeof typeIcons];
                return (
                  <Card key={ticket.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors">
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
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Ticket className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    No tickets found
                  </h3>
                  <p className="text-neutral-600 mb-4">
                    No tickets match your current filters.
                  </p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Ticket
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}