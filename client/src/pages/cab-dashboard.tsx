import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, AlertTriangle, Users, Calendar, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

export default function CABDashboard() {
  const [selectedChange, setSelectedChange] = useState<PendingChange | null>(null);
  const [approvalComments, setApprovalComments] = useState("");
  const [approvalDecision, setApprovalDecision] = useState<"approved" | "rejected" | "">("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending changes
  const { data: pendingChanges, isLoading, refetch } = useQuery({
    queryKey: ["cab-pending-changes"],
    queryFn: async () => {
      const response = await fetch("/api/cab/pending-changes");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<PendingChange[]>;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to fetch pending changes",
        variant: "destructive",
      });
    }
  });

  // Fetch CAB boards
  const { data: cabBoards } = useQuery({
    queryKey: ["cab-boards"],
    queryFn: async () => {
      const response = await fetch("/api/cab/boards");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<CABBoard[]>;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to fetch CAB boards",
        variant: "destructive",
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
          approver_id: "current-user" // In real app, get from auth context
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
      queryClient.invalidateQueries({ queryKey: ["cab-pending-changes"] });
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

  if (isLoading) {
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
            {cabBoards?.length || 0} Active CAB{(cabBoards?.length || 0) !== 1 ? 's' : ''}
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

        <TabsContent value="boards">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <Users className="w-12 h-12 text-muted-foreground mx-auto" />
                <h3 className="font-medium">CAB Management</h3>
                <p className="text-sm text-muted-foreground">Manage Change Advisory Board settings</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}