import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import RelatedArticles from "@/components/tickets/related-articles";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  UserCheck,
  MessageSquare,
  Settings,
  Ticket,
  AlertTriangle,
  Wrench,
  RefreshCw,
  CheckCircle,
  XCircle,
  FileText,
  Shield,
  Target,
  TrendingUp,
  Info,
  PlayCircle,
  PauseCircle,
  StopCircle
} from "lucide-react";

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
  impact?: string;
  urgency?: string;
  root_cause?: string;
  workaround?: string;
  known_error?: boolean;
  change_type?: string;
  risk_level?: string;
  approval_status?: string;
  implementation_plan?: string;
  rollback_plan?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  sla_policy?: string;
  sla_response_time?: number;
  sla_resolution_time?: number;
  sla_breached?: boolean;
}

export default function TicketDetail() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/tickets/:id");
  const id = params?.id;
  const { toast } = useToast();

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddCommentDialog, setShowAddCommentDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);
  const [showUpdateFieldDialog, setShowUpdateFieldDialog] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [statusChangeComment, setStatusChangeComment] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [pendingStatusChange, setPendingStatusChange] = useState("");
  const [updateField, setUpdateField] = useState<string>("");
  const [updateValue, setUpdateValue] = useState<string>("");
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchTicket(id);
      fetchTechnicians();
      fetchComments(id);
    }
  }, [id]);

  const fetchTechnicians = async () => {
    try {
      const response = await api.get('/api/users/technicians');
      if (response.ok) {
        const technicianData = await response.json();
        setTechnicians(technicianData);
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const fetchComments = async (ticketId: string) => {
    try {
      const response = await api.get(`/api/tickets/${ticketId}/comments`);
      if (response.ok) {
        const commentsData = await response.json();
        setComments(commentsData);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchTicket = async (ticketId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/tickets/${ticketId}`);
      if (response.ok) {
        const ticketData = await response.json();
        setTicket(ticketData);
      } else {
        throw new Error('Failed to fetch ticket');
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast({
        title: "Error",
        description: "Failed to fetch ticket details",
        variant: "destructive"
      });
      setLocation('/tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (newStatus: string) => {
    if (!ticket) return;

    // Require comment for certain status changes
    if (['resolved', 'closed', 'pending'].includes(newStatus)) {
      setPendingStatusChange(newStatus);
      setShowStatusChangeDialog(true);
      return;
    }

    // For other status changes, proceed directly
    await updateTicketStatus(newStatus, '');
  };

  const updateTicketStatus = async (newStatus: string, comment: string) => {
    if (!ticket) return;

    try {
      const updateData: any = { status: newStatus };
      if (comment.trim()) {
        updateData.comment = comment.trim();
      }

      const response = await api.put(`/api/tickets/${ticket.id}`, updateData);

      if (response.ok) {
        const updatedTicket = await response.json();
        setTicket(updatedTicket);
        fetchComments(ticket.id); // Refresh comments
        toast({
          title: "Success",
          description: `Ticket status updated to ${newStatus.replace('_', ' ')}`
        });
        setShowStatusChangeDialog(false);
        setStatusChangeComment('');
        setPendingStatusChange('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update ticket status",
        variant: "destructive"
      });
    }
  };

  const handleReassignTicket = async () => {
    if (!ticket || !selectedTechnician) return;

    try {
      const response = await api.put(`/api/tickets/${ticket.id}`, { 
        assigned_to: selectedTechnician 
      });

      if (response.ok) {
        const updatedTicket = await response.json();
        setTicket(updatedTicket);
        fetchComments(ticket.id); // Refresh comments to show reassignment
        toast({
          title: "Success",
          description: "Ticket reassigned successfully"
        });
        setShowReassignDialog(false);
        setSelectedTechnician('');
      }
    } catch (error) {
      console.error('Error reassigning ticket:', error);
      toast({
        title: "Error",
        description: "Failed to reassign ticket",
        variant: "destructive"
      });
    }
  };

  const handleUpdateField = async () => {
    if (!ticket || !updateField || !updateValue.trim()) return;

    try {
      const updateData = { [updateField]: updateValue.trim() };
      const response = await api.put(`/api/tickets/${ticket.id}`, updateData);

      if (response.ok) {
        const updatedTicket = await response.json();
        setTicket(updatedTicket);
        fetchComments(ticket.id); // Refresh comments
        toast({
          title: "Success",
          description: `${updateField.replace('_', ' ')} updated successfully`
        });
        setShowUpdateFieldDialog(false);
        setUpdateField('');
        setUpdateValue('');
      }
    } catch (error) {
      console.error('Error updating field:', error);
      toast({
        title: "Error",
        description: "Failed to update field",
        variant: "destructive"
      });
    }
  };

  const handleAddComment = async () => {
    if (!ticket || !newCommentText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a comment",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await api.post(`/api/tickets/${ticket.id}/comments`, {
        comment: newCommentText,
        author_email: "admin@company.com",
        is_internal: false
      });

      if (response.ok) {
        setNewCommentText("");
        setShowAddCommentDialog(false);
        fetchComments(ticket.id); // Refresh comments
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

  const renderWorkflowActions = (ticket: TicketData) => {
    const actions = [];

    switch (ticket.status) {
      case "new":
        actions.push(
          <Button 
            key="assign" 
            variant="default" 
            size="sm"
            onClick={() => handleUpdateTicketStatus("assigned")}
          >
            Assign to Self
          </Button>
        );
        actions.push(
          <Button 
            key="in_progress" 
            variant="outline" 
            size="sm"
            onClick={() => handleUpdateTicketStatus("in_progress")}
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
            onClick={() => handleUpdateTicketStatus("in_progress")}
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
            onClick={() => handleUpdateTicketStatus("pending")}
          >
            Mark as Pending
          </Button>
        );
        actions.push(
          <Button 
            key="resolved" 
            variant="default" 
            size="sm"
            onClick={() => handleUpdateTicketStatus("resolved")}
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
            onClick={() => handleUpdateTicketStatus("in_progress")}
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
            onClick={() => handleUpdateTicketStatus("closed")}
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

  const renderTypeSpecificSection = (ticket: TicketData) => {
    switch (ticket.type) {
      case 'incident':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                Incident Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Impact</Label>
                  <p className="font-medium capitalize">{ticket.impact || 'Medium'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Urgency</Label>
                  <p className="font-medium capitalize">{ticket.urgency || 'Medium'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">SLA Policy</Label>
                  <p className="font-medium">{ticket.sla_policy || 'Standard SLA'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">SLA Status</Label>
                  <Badge variant={ticket.sla_breached ? "destructive" : "default"}>
                    {ticket.sla_breached ? "Breached" : "Within SLA"}
                  </Badge>
                </div>
              </div>
              <div className="flex space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUpdateField('impact');
                    setUpdateValue(ticket.impact || '');
                    setShowUpdateFieldDialog(true);
                  }}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Update Impact
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUpdateField('urgency');
                    setUpdateValue(ticket.urgency || '');
                    setShowUpdateFieldDialog(true);
                  }}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Update Urgency
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'problem':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Wrench className="w-5 h-5 mr-2 text-orange-600" />
                Problem Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Known Error</Label>
                <Badge variant={ticket.known_error ? "destructive" : "default"}>
                  {ticket.known_error ? "Yes" : "No"}
                </Badge>
              </div>
              {ticket.root_cause && (
                <div>
                  <Label className="text-xs text-muted-foreground">Root Cause</Label>
                  <p className="font-medium text-sm mt-1">{ticket.root_cause}</p>
                </div>
              )}
              {ticket.workaround && (
                <div>
                  <Label className="text-xs text-muted-foreground">Workaround</Label>
                  <p className="font-medium text-sm mt-1">{ticket.workaround}</p>
                </div>
              )}
              <div className="flex space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUpdateField('root_cause');
                    setUpdateValue(ticket.root_cause || '');
                    setShowUpdateFieldDialog(true);
                  }}
                >
                  <Info className="w-4 h-4 mr-2" />
                  Update Root Cause
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUpdateField('workaround');
                    setUpdateValue(ticket.workaround || '');
                    setShowUpdateFieldDialog(true);
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Update Workaround
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'change':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <RefreshCw className="w-5 h-5 mr-2 text-blue-600" />
                Change Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Change Type</Label>
                  <p className="font-medium capitalize">{ticket.change_type || 'Normal'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Risk Level</Label>
                  <Badge variant={
                    ticket.risk_level === 'high' ? 'destructive' :
                    ticket.risk_level === 'medium' ? 'default' : 'secondary'
                  }>
                    {ticket.risk_level || 'Low'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Approval Status</Label>
                  <Badge variant={
                    ticket.approval_status === 'approved' ? 'default' :
                    ticket.approval_status === 'rejected' ? 'destructive' : 'secondary'
                  }>
                    {ticket.approval_status || 'Pending'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Scheduled</Label>
                  <p className="font-medium">
                    {ticket.scheduled_start ? formatDate(ticket.scheduled_start) : 'Not scheduled'}
                  </p>
                </div>
              </div>

              {ticket.implementation_plan && (
                <div>
                  <Label className="text-xs text-muted-foreground">Implementation Plan</Label>
                  <p className="font-medium text-sm mt-1 bg-gray-50 p-2 rounded">{ticket.implementation_plan}</p>
                </div>
              )}

              {ticket.rollback_plan && (
                <div>
                  <Label className="text-xs text-muted-foreground">Rollback Plan</Label>
                  <p className="font-medium text-sm mt-1 bg-gray-50 p-2 rounded">{ticket.rollback_plan}</p>
                </div>
              )}

              <div className="flex space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUpdateField('implementation_plan');
                    setUpdateValue(ticket.implementation_plan || '');
                    setShowUpdateFieldDialog(true);
                  }}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Update Implementation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUpdateField('rollback_plan');
                    setUpdateValue(ticket.rollback_plan || '');
                    setShowUpdateFieldDialog(true);
                  }}
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  Update Rollback
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'request':
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Ticket className="w-5 h-5 mr-2 text-green-600" />
                Service Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Service Category</Label>
                  <p className="font-medium">{ticket.category || 'General'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Expected Completion</Label>
                  <p className="font-medium">
                    {ticket.due_date ? formatDate(ticket.due_date) : 'Not set'}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUpdateField('category');
                    setUpdateValue(ticket.category || '');
                    setShowUpdateFieldDialog(true);
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Update Category
                </Button>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/tickets')}
            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tickets
          </Button>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/tickets')}
            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tickets
          </Button>
        </div>
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <p className="text-xl font-medium text-neutral-600 mb-2">Ticket not found</p>
          <p className="text-neutral-500">The ticket you're looking for doesn't exist or has been removed</p>
        </div>
      </div>
    );
  }

  const IconComponent = typeIcons[ticket.type as keyof typeof typeIcons];
  const isOverdue = ticket.due_date && new Date(ticket.due_date) < new Date();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/tickets')}
            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tickets
          </Button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-[#201F1E] dark:text-[#F3F2F1]">
            {ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)} Details
          </h1>
        </div>

        <div className="flex space-x-2">
          {renderWorkflowActions(ticket)}
          <Button variant="outline" size="sm" onClick={() => setShowReassignDialog(true)}>
            <User className="w-4 h-4 mr-2" />
            Reassign
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddCommentDialog(true)}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Add Comment
          </Button>
        </div>
      </div>

      {/* Ticket Header */}
      <Card className={`border-l-4 ${
        ticket.priority === "critical" ? "border-l-red-500 bg-red-50/50 dark:bg-red-900/10" :
        ticket.priority === "high" ? "border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10" :
        ticket.priority === "medium" ? "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10" :
        "border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
      } ${isOverdue ? "ring-2 ring-red-200" : ""}`}>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-xl ${
              ticket.type === 'incident' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
              ticket.type === 'problem' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
              ticket.type === 'change' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              <IconComponent className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <span className="font-mono text-xl font-bold text-blue-600">
                  {ticket.ticket_number}
                </span>
                <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                  {ticket.priority.toUpperCase()}
                </Badge>
                <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                  {ticket.status.replace('_', ' ').toUpperCase()}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive" className="animate-pulse">
                    OVERDUE
                  </Badge>
                )}
              </div>

              <h2 className="text-2xl font-bold mb-3 text-neutral-900 dark:text-neutral-100">
                {ticket.title}
              </h2>

              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                {ticket.description}
              </p>

              <div className="flex items-center space-x-6 text-sm text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>{ticket.requester_email}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Created: {formatDate(ticket.created_at)}</span>
                </div>
                {ticket.due_date && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                      Due: {formatDate(ticket.due_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment & Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assignment & Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Requester</Label>
              <p className="font-medium">{ticket.requester_email}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Assigned To</Label>
              <p className="font-medium">
                {ticket.assigned_to && ticket.assigned_to.trim() !== '' ? ticket.assigned_to : 'Unassigned'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Created</Label>
              <p className="font-medium">{formatDate(ticket.created_at)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Last Updated</Label>
              <p className="font-medium">{formatDate(ticket.updated_at)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Type-specific Section */}
        {renderTypeSpecificSection(ticket)}

        {/* Comments and Activity Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comments & Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No comments or activity yet</p>
              ) : (
                comments.map((comment, index) => (
                  <div key={index} className="border-l-2 border-blue-200 pl-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium text-sm">{comment.author_email}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                    {comment.is_internal && (
                      <Badge variant="secondary" className="mt-2 text-xs">Internal</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Related Knowledge Base Articles */}
        <RelatedArticles ticket={ticket} />
      </div>

      {/* Dialogs */}

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
              <Button onClick={handleAddComment} disabled={!newCommentText.trim()}>
                Add Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reassign Ticket</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="technician">Assign to Technician *</Label>
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.email}>
                      {tech.name} ({tech.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowReassignDialog(false);
                setSelectedTechnician("");
              }}>
                Cancel
              </Button>
              <Button onClick={handleReassignTicket} disabled={!selectedTechnician}>
                Reassign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Change Comment Dialog */}
      <Dialog open={showStatusChangeDialog} onOpenChange={setShowStatusChangeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Status Change Reason</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Please provide a reason for changing the status to "{pendingStatusChange.replace('_', ' ')}":
            </p>

            <div>
              <Label htmlFor="status-comment">Reason *</Label>
              <Textarea
                id="status-comment"
                value={statusChangeComment}
                onChange={(e) => setStatusChangeComment(e.target.value)}
                placeholder="Enter reason for status change..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowStatusChangeDialog(false);
                setStatusChangeComment("");
                setPendingStatusChange("");
              }}>
                Cancel
              </Button>
              <Button 
                onClick={() => updateTicketStatus(pendingStatusChange, statusChangeComment)}
                disabled={!statusChangeComment.trim()}
              >
                Update Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Field Dialog */}
      <Dialog open={showUpdateFieldDialog} onOpenChange={setShowUpdateFieldDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update {updateField.replace('_', ' ')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="update-value">New Value *</Label>
              {updateField.includes('plan') ? (
                <Textarea
                  id="update-value"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                  placeholder={`Enter new ${updateField.replace('_', ' ')}...`}
                  rows={4}
                />
              ) : (
                <Input
                  id="update-value"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                  placeholder={`Enter new ${updateField.replace('_', ' ')}...`}
                />
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowUpdateFieldDialog(false);
                setUpdateField("");
                setUpdateValue("");
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateField}
                disabled={!updateValue.trim()}
              >
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}