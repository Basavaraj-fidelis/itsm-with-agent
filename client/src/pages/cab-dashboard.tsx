import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, AlertTriangle, Users, Calendar, FileText, Plus, Trash2, Edit, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock API client for demonstration purposes
const api = {
  getUsers: async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    // Simulate a response with a data property
    return { data: [
      { id: "user1", email: "alice@example.com", name: "Alice Smith", role: "admin" },
      { id: "user2", email: "bob@example.com", name: "Bob Johnson", role: "member" },
      { id: "user3", email: "charlie@example.com", name: "Charlie Brown", role: "member" },
    ]};
  },
  get: async (endpoint: string) => {
    // Simulate API calls for other endpoints
    await new Promise(resolve => setTimeout(resolve, 100));
    if (endpoint === "/cab/boards") {
      return { ok: true, json: async () => [
        { id: "cab1", name: "Frontend CAB", description: "Manages frontend changes", chairperson_id: "user1", members: ["user1", "user2"], meeting_frequency: "Weekly", is_active: true, created_at: "2023-01-01" },
        { id: "cab2", name: "Backend CAB", description: "Manages backend changes", chairperson_id: "user2", members: ["user2", "user3"], meeting_frequency: "Bi-weekly", is_active: true, created_at: "2023-02-01" },
      ]};
    } else if (endpoint === "/cab/pending-changes") {
      return { ok: true, json: async () => [
        { id: "change1", ticket_number: "TKT-001", title: "Update UI Button", description: "Change button color to blue", change_type: "feature", priority: "medium", risk_level: "low", requester_email: "alice@example.com", created_at: "2023-10-01", planned_implementation_date: "2023-10-15", approval_status: "pending" },
        { id: "change2", ticket_number: "TKT-002", title: "Fix Login Bug", description: "Resolve issue where users cannot log in", change_type: "bugfix", priority: "critical", risk_level: "high", requester_email: "bob@example.com", created_at: "2023-10-05", planned_implementation_date: "2023-10-10", approval_status: "pending" },
      ]};
    }
    return { ok: false, statusText: "Not Found" };
  },
  post: async (endpoint: string, body: any) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`POST ${endpoint}`, body);
    return { ok: true, json: async () => ({ success: true }) };
  },
  put: async (endpoint: string, body: any) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`PUT ${endpoint}`, body);
    return { ok: true, json: async () => ({ success: true }) };
  }
};

interface PendingChange {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  change_type: string;
  priority: string;
  risk_level: string;
  requester_email: string;
  created_at: string;
  planned_implementation_date?: string;
  approval_status: string;
}

interface CABBoard {
  id: string;
  name: string;
  description?: string;
  chairperson_id: string;
  members: string[];
  meeting_frequency?: string;
  is_active: boolean;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  first_name: string;
  last_name: string;
}

interface NewCABBoard {
  name: string;
  description: string;
  chairperson_id: string;
  members: string[];
  meeting_frequency: string;
}

export default function CABDashboard() {
  const [selectedChange, setSelectedChange] = useState<PendingChange | null>(null);
  const [approvalComments, setApprovalComments] = useState("");
  const [approvalDecision, setApprovalDecision] = useState<"approved" | "rejected" | "">("");
  const [showCreateCAB, setShowCreateCAB] = useState(false);
  const [showEditCAB, setShowEditCAB] = useState(false);
  const [selectedCAB, setSelectedCAB] = useState<CABBoard | null>(null);
  const [newCAB, setNewCAB] = useState<NewCABBoard>({
    name: '',
    description: '',
    chairperson_id: '',
    members: [],
    meeting_frequency: 'Weekly'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users for CAB member selection
  const { data: usersResponse } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.getUsers(),
    staleTime: 5 * 60 * 1000,
  });

  // Extract users array from response
  const users = usersResponse?.data || [];

  // Fetch CAB boards
  const { data: boards = [] } = useQuery({
    queryKey: ["cab-boards"],
    queryFn: async () => {
      try {
        const response = await api.get("/cab/boards");
        if (!response.ok) {
          console.error("CAB boards API error:", response.status);
          return [];
        }
        return response.json();
      } catch (error) {
        console.error("Failed to fetch CAB boards:", error);
        return [];
      }
    },
  });

  // Fetch pending changes
  const { data: pendingChanges = [] } = useQuery({
    queryKey: ["pending-changes"],
    queryFn: async () => {
      try {
        const response = await api.get("/cab/pending-changes");
        if (!response.ok) {
          console.error("Pending changes API error:", response.status);
          return [];
        }
        return response.json();
      } catch (error) {
        console.error("Failed to fetch pending changes:", error);
        return [];
      }
    },
    refetchInterval: 30000,
  });

  // Create CAB board mutation
  const createCABMutation = useMutation({
    mutationFn: async (cabData: NewCABBoard) => {
      const response = await fetch("/api/cab/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(cabData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "CAB board created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["cab-boards"] }); // Use the correct query key
      setShowCreateCAB(false);
      setNewCAB({
        name: '',
        description: '',
        chairperson_id: '',
        members: [],
        meeting_frequency: 'Weekly'
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create CAB board: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Update CAB board mutation
  const updateCABMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewCABBoard> }) => {
      const response = await fetch(`/api/cab/boards/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "CAB board updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["cab-boards"] }); // Use the correct query key
      setShowEditCAB(false);
      setSelectedCAB(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update CAB board: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Process approval mutation
  const processApprovalMutation = useMutation({
    mutationFn: async ({ ticketId, decision, comments }: {
      ticketId: string;
      decision: "approved" | "rejected";
      comments?: string;
    }) => {
      const response = await fetch(`/api/cab/approval/${ticketId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          decision,
          comments,
          approver_id: "current-user" // This should ideally be a real user ID
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Approval decision processed successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["pending-changes"] });
      setSelectedChange(null);
      setApprovalComments("");
      setApprovalDecision("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to process approval: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleApprovalSubmit = () => {
    if (!selectedChange || !approvalDecision) return;

    processApprovalMutation.mutate({
      ticketId: selectedChange.id,
      decision: approvalDecision,
      comments: approvalComments
    });
  };

  const handleCreateCAB = () => {
    if (!newCAB.name || !newCAB.chairperson_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    createCABMutation.mutate(newCAB);
  };

  const handleEditCAB = (cab: CABBoard) => {
    setSelectedCAB(cab);
    setNewCAB({
      name: cab.name,
      description: cab.description || '',
      chairperson_id: cab.chairperson_id,
      members: cab.members,
      meeting_frequency: cab.meeting_frequency || 'Weekly'
    });
    setShowEditCAB(true);
  };

  const handleUpdateCAB = () => {
    if (!selectedCAB || !newCAB.name || !newCAB.chairperson_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    updateCABMutation.mutate({
      id: selectedCAB.id,
      data: newCAB
    });
  };

  const addMemberToCAB = (userId: string) => {
    if (!newCAB.members.includes(userId)) {
      setNewCAB(prev => ({
        ...prev,
        members: [...prev.members, userId]
      }));
    }
  };

  const removeMemberFromCAB = (userId: string) => {
    setNewCAB(prev => ({
      ...prev,
      members: prev.members.filter(id => id !== userId)
    }));
  };

  // Fix getUserName function to handle array properly
  const getUserName = (userId: string) => {
    if (!Array.isArray(users)) return userId;
    const user = users.find((u: any) => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : userId;
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  if (!users || !boards) { // Check if data is still loading
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CAB Dashboard</h1>
          <p className="text-muted-foreground">Change Advisory Board - Review and approve change requests</p>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <span className="text-sm text-muted-foreground">
            {boards?.length || 0} Active CAB{(boards?.length || 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="history">Approval History</TabsTrigger>
          <TabsTrigger value="boards">CAB Management</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <div className="grid gap-4">
            {pendingChanges?.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center space-y-2">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                    <h3 className="font-medium">No Pending Changes</h3>
                    <p className="text-sm text-muted-foreground">All changes have been reviewed</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              pendingChanges?.map((change) => (
                <Card key={change.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{change.ticket_number}</CardTitle>
                        <p className="text-sm text-muted-foreground">{change.title}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getRiskBadgeColor(change.risk_level)}>
                          {change.risk_level} Risk
                        </Badge>
                        <Badge variant={getPriorityBadgeColor(change.priority)}>
                          {change.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {change.change_type}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Requested By</Label>
                        <p className="font-medium text-sm">{change.requester_email}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Created</Label>
                        <p className="font-medium text-sm">
                          {new Date(change.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Planned Date</Label>
                        <p className="font-medium text-sm">
                          {change.planned_implementation_date
                            ? new Date(change.planned_implementation_date).toLocaleDateString()
                            : "TBD"
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-orange-500" />
                          <span className="text-sm font-medium text-orange-600">Pending</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm mt-1 line-clamp-2">{change.description}</p>
                    </div>

                    <div className="flex justify-end">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button onClick={() => setSelectedChange(change)}>
                            <FileText className="w-4 h-4 mr-2" />
                            Review Change
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Review Change Request - {change.ticket_number}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="font-medium">Title</Label>
                                <p className="text-sm mt-1">{change.title}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Change Type</Label>
                                <Badge variant="outline" className="capitalize mt-1">
                                  {change.change_type}
                                </Badge>
                              </div>
                              <div>
                                <Label className="font-medium">Risk Level</Label>
                                <Badge variant={getRiskBadgeColor(change.risk_level)} className="mt-1">
                                  {change.risk_level}
                                </Badge>
                              </div>
                              <div>
                                <Label className="font-medium">Priority</Label>
                                <Badge variant={getPriorityBadgeColor(change.priority)} className="mt-1">
                                  {change.priority}
                                </Badge>
                              </div>
                            </div>

                            <div>
                              <Label className="font-medium">Description</Label>
                              <p className="text-sm mt-1 bg-muted p-3 rounded">{change.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="decision">Approval Decision</Label>
                                <Select value={approvalDecision} onValueChange={(value: "approved" | "rejected") => setApprovalDecision(value)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select decision" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="approved">
                                      <div className="flex items-center space-x-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span>Approve</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="rejected">
                                      <div className="flex items-center space-x-2">
                                        <XCircle className="w-4 h-4 text-red-600" />
                                        <span>Reject</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="comments">Comments</Label>
                              <Textarea
                                id="comments"
                                placeholder="Add your review comments..."
                                value={approvalComments}
                                onChange={(e) => setApprovalComments(e.target.value)}
                                className="mt-1"
                              />
                            </div>

                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setSelectedChange(null)}>
                                Cancel
                              </Button>
                              <Button
                                onClick={handleApprovalSubmit}
                                disabled={!approvalDecision || processApprovalMutation.isPending}
                                className={approvalDecision === "approved" ? "bg-green-600 hover:bg-green-700" :
                                          approvalDecision === "rejected" ? "bg-red-600 hover:bg-red-700" : ""}
                              >
                                {processApprovalMutation.isPending ? "Processing..." : "Submit Decision"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
                <h3 className="font-medium">Approval History</h3>
                <p className="text-sm text-muted-foreground">View past approval decisions</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="boards" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">CAB Management</h2>
            <Dialog open={showCreateCAB} onOpenChange={setShowCreateCAB}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create CAB Board
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New CAB Board</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cab-name">CAB Name *</Label>
                      <Input
                        id="cab-name"
                        value={newCAB.name}
                        onChange={(e) => setNewCAB(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter CAB board name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="meeting-frequency">Meeting Frequency</Label>
                      <Select
                        value={newCAB.meeting_frequency}
                        onValueChange={(value) => setNewCAB(prev => ({ ...prev, meeting_frequency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Daily">Daily</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newCAB.description}
                      onChange={(e) => setNewCAB(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter CAB board description"
                    />
                  </div>

                  <div>
                    <Label htmlFor="chairperson">Chairperson *</Label>
                    <Select
                      value={newCAB.chairperson_id}
                      onValueChange={(value) => setNewCAB(prev => ({ ...prev, chairperson_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select chairperson" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(users) && users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>CAB Members</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Select onValueChange={addMemberToCAB}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Add member" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(users) && users.filter(user => !newCAB.members.includes(user.id)).map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        {newCAB.members.map(memberId => (
                          <div key={memberId} className="flex items-center justify-between bg-muted p-2 rounded">
                            <span className="text-sm">{getUserName(memberId)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMemberFromCAB(memberId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCreateCAB(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateCAB} disabled={createCABMutation.isPending}>
                      {createCABMutation.isPending ? "Creating..." : "Create CAB Board"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {boards?.map((cab) => (
              <Card key={cab.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{cab.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{cab.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={cab.is_active ? "default" : "secondary"}>
                        {cab.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => handleEditCAB(cab)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Chairperson</Label>
                      <p className="font-medium text-sm">{getUserName(cab.chairperson_id)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Meeting Frequency</Label>
                      <p className="font-medium text-sm">{cab.meeting_frequency || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Members</Label>
                      <p className="font-medium text-sm">{cab.members.length} member(s)</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label className="text-xs text-muted-foreground">CAB Members</Label>
                    <div className="mt-2 space-y-1">
                      {cab.members.map(memberId => (
                        <Badge key={memberId} variant="outline" className="mr-2 mb-1">
                          <UserPlus className="w-3 h-3 mr-1" />
                          {getUserName(memberId)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edit CAB Dialog */}
          <Dialog open={showEditCAB} onOpenChange={setShowEditCAB}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit CAB Board</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-cab-name">CAB Name *</Label>
                    <Input
                      id="edit-cab-name"
                      value={newCAB.name}
                      onChange={(e) => setNewCAB(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter CAB board name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-meeting-frequency">Meeting Frequency</Label>
                    <Select
                      value={newCAB.meeting_frequency}
                      onValueChange={(value) => setNewCAB(prev => ({ ...prev, meeting_frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={newCAB.description}
                    onChange={(e) => setNewCAB(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter CAB board description"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-chairperson">Chairperson *</Label>
                  <Select
                    value={newCAB.chairperson_id}
                    onValueChange={(value) => setNewCAB(prev => ({ ...prev, chairperson_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chairperson" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(users) && users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>CAB Members</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Select onValueChange={addMemberToCAB}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Add member" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(users) && users.filter(user => !newCAB.members.includes(user.id)).map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      {newCAB.members.map(memberId => (
                        <div key={memberId} className="flex items-center justify-between bg-muted p-2 rounded">
                          <span className="text-sm">{getUserName(memberId)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMemberFromCAB(memberId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowEditCAB(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateCAB} disabled={updateCABMutation.isPending}>
                    {updateCABMutation.isPending ? "Updating..." : "Update CAB Board"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}