
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  User,
  Calendar,
  Clock,
  Edit,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Wrench,
  RefreshCw,
  Ticket
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
}

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddCommentDialog, setShowAddCommentDialog] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");

  useEffect(() => {
    if (id) {
      fetchTicket(id);
    }
  }, [id]);

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
      navigate('/tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (newStatus: string) => {
    if (!ticket) return;

    try {
      const response = await api.put(`/api/tickets/${ticket.id}`, { status: newStatus });
      if (response.ok) {
        const updatedTicket = await response.json();
        setTicket(updatedTicket);
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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/tickets')}>
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
          <Button variant="ghost" onClick={() => navigate('/tickets')}>
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
          <Button variant="ghost" onClick={() => navigate('/tickets')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tickets
          </Button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-[#201F1E] dark:text-[#F3F2F1]">
            Ticket Details
          </h1>
        </div>
        
        <div className="flex space-x-2">
          {renderWorkflowActions(ticket)}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ticket Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <p className="font-medium capitalize">{ticket.type}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <p className="font-medium capitalize">{ticket.priority}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <p className="font-medium capitalize">{ticket.status.replace('_', ' ')}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <p className="font-medium">{ticket.category || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <p className="font-medium">{ticket.assigned_to || 'Unassigned'}</p>
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
      </div>

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
              <Button onClick={handleAddComment}>
                Add Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
