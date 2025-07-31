import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnhancedErrorBoundary } from '@/components/ui/enhanced-error-boundary';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  Calendar,
  Mail,
  Phone,
  Building,
  Download,
  Upload,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Database,
  Cloud,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Lock,
  Unlock,
  User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UserInterface {
  id: string;
  email: string;
  name: string;
  username?: string;
  role: string;
  department: string;
  phone: string;
  is_active: boolean;
  is_locked?: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  ad_synced?: boolean;
  ad_last_sync?: string;
  ad_groups?: string[];
  job_title?: string;
  location?: string;
  first_name?: string;
  last_name?: string;
}

interface ADSyncStatus {
  enabled: boolean;
  last_sync: string;
  sync_status: 'success' | 'error' | 'pending';
  total_users: number;
  synced_users: number;
  errors: string[];
}

// Helper function to get sync status icon
function getSyncStatusIcon(user: UserInterface) {
  if (user.ad_synced) {
    return <Cloud className="w-4 h-4 text-blue-500" />;
  } else {
    return <Database className="w-4 h-4 text-gray-500" />;
  }
}

// Helper function to get user source icon
function getUserSourceIcon(user: UserInterface) {
  return <Database className="w-4 h-4 text-gray-500" />;
}

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [syncSourceFilter, setSyncSourceFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInterface | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const [newUser, setNewUser] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "user",
    password: "",
    department: "",
    phone: "",
    job_title: "",
    location: ""
  });

    const [editingUser, setEditingUser] = useState<UserInterface | null>(null);


  // Fetch users
  const { data: usersResponse, isLoading, error, refetch } = useQuery({
    queryKey: ["users", { search: searchTerm, role: roleFilter }],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("search", searchTerm);
        if (roleFilter !== "all") params.append("role", roleFilter);

        const response = await fetch(`/api/users?${params}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Failed to fetch users:', error);
        throw error;
      }
    },
    refetchInterval: 120000,
    retry: 3,
    retryDelay: 1000
  });

  // Extract users array from response
  const users = usersResponse?.data || usersResponse || [];

  // Fetch AD sync status - REMOVED
  // const { data: adSyncStatus } = useQuery({
  //   queryKey: ["/api/ad/sync-status"],
  //   queryFn: async () => {
  //     try {
  //       const response = await api.get("/api/ad/sync-status");
  //       if (!response.ok) throw new Error("Failed to fetch AD sync status");
  //       return await response.json();
  //     } catch (error) {
  //       return {
  //         enabled: false,
  //         last_sync: null,
  //         sync_status: 'error',
  //         total_users: 0,
  //         synced_users: 0,
  //         errors: []
  //       };
  //     }
  //   },
  //   refetchInterval: 30000,
  // });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create user");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User created successfully" });
      setIsCreateDialogOpen(false);
      setNewUser({
        email: "",
        first_name: "",
        last_name: "",
        role: "user",
        password: "",
        department: "",
        phone: "",
        job_title: "",
        location: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, first_name, last_name, ...userData }: any) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ first_name, last_name, ...userData })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User updated successfully" });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Lock user mutation
  const lockUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      console.log(`Attempting to lock user ${userId} with reason: ${reason}`);

      const response = await fetch(`/api/users/${userId}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Lock user error:', errorData);
        throw new Error(errorData.message || 'Failed to lock user');
      }

      const result = await response.json();
      console.log('Lock user success:', result);
      return result;
    },
    onSuccess: (data) => {
      refetch();
      toast({
        title: "Success",
        description: `User ${data.user?.email || 'user'} has been locked successfully`
      });
    },
    onError: (error: any) => {
      console.error('Lock user mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to lock user",
        variant: "destructive"
      });
    }
  });

  // Unlock user mutation
  const unlockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      console.log(`Attempting to unlock user ${userId}`);

      const response = await fetch(`/api/users/${userId}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Unlock user error:', errorData);
        throw new Error(errorData.message || 'Failed to unlock user');
      }

      const result = await response.json();
      console.log('Unlock user success:', result);
      return result;
    },
    onSuccess: (data) => {
      refetch();
      toast({
        title: "Success",
        description: `User ${data.user?.email || 'user'} has been unlocked successfully`
      });
    },
    onError: (error: any) => {
      console.error('Unlock user mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to unlock user",
        variant: "destructive"
      });
    }
  });

  // AD Sync mutation - REMOVED
  // const adSyncMutation = useMutation({
  //   mutationFn: async () => {
  //     const response = await api.post("/api/ad/sync-users");
  //     if (!response.ok) throw new Error("Failed to sync AD users");
  //     return await response.json();
  //   },
  //   onSuccess: (data) => {
  //     toast({ 
  //       title: "Success", 
  //       description: `AD sync completed. ${data.synced_count || 0} users synced.`
  //     });
  //     queryClient.invalidateQueries({ queryKey: ["/api/users"] });
  //     queryClient.invalidateQueries({ queryKey: ["/api/ad/sync-status"] });
  //   },
  //   onError: (error: any) => {
  //     toast({
  //       title: "Error",
  //       description: error.message || "Failed to sync AD users",
  //       variant: "destructive",
  //     });
  //   },
  // });

  // Import end users mutation
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/users/import-end-users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to import end users");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import Successful",
        description: `${data.imported} new end users imported. ${data.skipped} duplicates skipped.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import end users",
        variant: "destructive",
      });
    },
  });

  // Filter users based on all criteria, excluding end_user role
  const filteredUsers = users.filter((user: UserInterface) => {
    // Exclude end users from User Directory
    if (user.role === 'end_user') {
      return false;
    }

    const matchesSearch = !searchTerm || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesDepartment = departmentFilter === "all" || user.department === departmentFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active);

    // REMOVE ad_synced filter here

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus; //&& matchesSyncSource;
  });

  // Get unique departments for filter
  const departments = [...new Set(users.map((user: UserInterface) => user.department).filter(Boolean))];

  // User statistics
  const stats = {
    total: users.length,
    active: users.filter((u: UserInterface) => u.is_active).length,
    inactive: users.filter((u: UserInterface) => !u.is_active).length,
    adSynced: users.filter((u: UserInterface) => u.ad_synced).length,
    local: users.filter((u: UserInterface) => !u.ad_synced).length,
  };

  const handleCreateUser = async () => {
    try {
      createUserMutation.mutate({
        ...newUser,
        name: `${newUser.first_name} ${newUser.last_name}`.trim()
      });
      setNewUser({
        email: "",
        first_name: "",
        last_name: "",
        role: "user",
        password: "",
        department: "",
        phone: "",
        job_title: "",
        location: ""
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Error creating user:", error);
      toast({ message: "Failed to create user", type: "error" });
    }
  };

  const handleUpdateUser = async () => {
    try {
      if (selectedUser) {
        console.log("Updating user:", selectedUser);
        const updateData = {
          id: selectedUser.id,
          email: selectedUser.email,
          first_name: selectedUser.first_name || '',
          last_name: selectedUser.last_name || '',
          role: selectedUser.role,
          department: selectedUser.department,
          phone: selectedUser.phone,
          is_active: selectedUser.is_active
        };
        updateUserMutation.mutate(updateData);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ message: "Failed to update user", type: "error" });
    }
  };

  const handleLockUser = (userId: string) => {
    const reason = prompt("Enter reason for locking user:");
    if (reason) {
      lockUserMutation.mutate({ userId, reason });
    }
  };

  const handleUnlockUser = (userId: string) => {
    if (confirm("Are you sure you want to unlock this user?")) {
      unlockUserMutation.mutate(userId);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    importMutation.mutate(formData);

    // Reset the input
    event.target.value = '';
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedUsers.length === 0) return;

    switch (bulkAction) {
      case "activate":
        selectedUsers.forEach(userId => {
          const user = users.find((u: UserInterface) => u.id === userId);
          if (user) {
            updateUserMutation.mutate({ ...user, is_active: true });
          }
        });
        break;
      case "deactivate":
        selectedUsers.forEach(userId => {
          const user = users.find((u: UserInterface) => u.id === userId);
          if (user) {
            updateUserMutation.mutate({ ...user, is_active: false });
          }
        });
        break;
      case "export":
        // Export selected users to CSV functionality
        const selectedUserData = users.filter((u: UserInterface) => selectedUsers.includes(u.id));
        const csv = selectedUserData.map((u: UserInterface) => 
          `"${u.name}","${u.email}","${u.role}","${u.department || 'N/A'}","${u.is_active ? 'Active' : 'Inactive'}","Local","${u.phone || ''}","${u.job_title || ''}"`
        ).join('\n');
        const blob = new Blob([`"Name","Email","Role","Department","Status","Source","Phone","Job Title"\n${csv}`], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `selected-users-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        break;
    }
    setSelectedUsers([]);
    setBulkAction("");
  };

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setDepartmentFilter("all");
    setStatusFilter("all");
    setSyncSourceFilter("all");
  };

  // Get user source icon function (all users are local now)
  const getUserSourceIcon = (user: UserInterface) => {
    return <Database className="w-4 h-4 text-gray-500" title="Local User" />;
  };


  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Users</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error instanceof Error ? error.message : 'Failed to load user data. Please try again.'}
          </p>
          <Button onClick={() => refetch()} variant="outline" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <EnhancedErrorBoundary>
    <div className="p-6 space-y-6">
      {/* Header with Statistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Directory</h1>
            <p className="text-gray-600">Manage system users and permissions</p>
          </div>
          <div className="flex items-center space-x-2">

            <div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="import-end-users"
              />
              <Button
                onClick={() => document.getElementById('import-end-users')?.click()}
                variant="outline"
                size="sm"
                disabled={importMutation.isPending}
              >
                <Upload className="w-4 h-4 mr-2" />
                {importMutation.isPending ? "Importing..." : "Import End Users"}
              </Button>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserX className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">AD Synced</p>
                  <p className="text-2xl font-bold">{stats.adSynced}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Local</p>
                  <p className="text-2xl font-bold">{stats.local}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users by name, email, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
              </SelectContent>
            </Select>

            {/* REMOVED AD Sync Source Filter */}
            {/* <Select value={syncSourceFilter} onValueChange={setSyncSourceFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="ad">AD Synced</SelectItem>
                <SelectItem value="local">Local Only</SelectItem>
              </SelectContent>
            </Select> */}

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => {
              setSearchTerm("");
              setRoleFilter("all");
              setSyncSourceFilter("all");
              setDepartmentFilter("all");
              setStatusFilter("all");
            }}>
              Clear Filters
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedUsers.length} user(s) selected
                </span>
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Bulk Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activate">Activate Users</SelectItem>
                    <SelectItem value="deactivate">Deactivate Users</SelectItem>
                    <SelectItem value="export">Export Selected</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                >
                  Apply
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedUsers([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Users ({filteredUsers.length})</span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map((u: UserInterface) => u.id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    />
                  </th>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Source</th>
                  <th className="text-left p-2">Last Login</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user: UserInterface) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                          }
                        }}
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant={
                        user.role === 'admin' ? 'destructive' :
                        user.role === 'manager' ? 'default' : 'secondary'
                      }>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center space-x-1">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{user.department || '-'}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-col space-y-1">
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {user.is_locked && (
                          <Badge variant="destructive" className="text-xs">
                            Locked
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center space-x-1">
                        {getUserSourceIcon(user)}
                        <span className="text-sm">
                          Local
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      <span className="text-sm text-gray-600">
                        {user.last_login ? 
                          formatDistanceToNow(new Date(user.last_login), { addSuffix: true }) : 
                          'Never'
                        }
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsViewDialogOpen(true);
                          }}
                          title="View User"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditDialogOpen(true);
                          }}
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {user.is_active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLockUser(user.id)}
                            className="text-yellow-600 hover:text-yellow-700"
                            title="Lock User"
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlockUser(user.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Unlock User"
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={newUser.first_name}
                onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                placeholder="Enter first name"
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={newUser.last_name}
                onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                placeholder="Enter last name"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Select 
                value={newUser.department} 
                onValueChange={(value) => setNewUser({ ...newUser, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT Department">IT Department</SelectItem>
                  <SelectItem value="HR Department">HR Department</SelectItem>
                  <SelectItem value="Finance Department">Finance Department</SelectItem>
                  <SelectItem value="Operations Department">Operations Department</SelectItem>
                  <SelectItem value="Marketing Department">Marketing Department</SelectItem>
                  <SelectItem value="Sales Department">Sales Department</SelectItem>
                  <SelectItem value="Engineering Department">Engineering Department</SelectItem>
                  <SelectItem value="Support Department">Support Department</SelectItem>
                  <SelectItem value="Legal Department">Legal Department</SelectItem>
                  <SelectItem value="Admin Department">Admin Department</SelectItem>
                  {departments.filter(dept => 
                    !['IT Department', 'HR Department', 'Finance Department', 'Operations Department', 
                      'Marketing Department', 'Sales Department', 'Engineering Department', 
                      'Support Department', 'Legal Department', 'Admin Department'].includes(dept)
                  ).map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={newUser.job_title}
                onChange={(e) => setNewUser({ ...newUser, job_title: e.target.value })}
                placeholder="Enter job title"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={newUser.location}
                onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
                placeholder="Enter location"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending || !newUser.first_name || !newUser.email || !newUser.password || !newUser.role}
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-medium text-blue-600">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                  <p className="text-gray-600">{selectedUser.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={selectedUser.is_active ? 'default' : 'secondary'}>
                        {selectedUser.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {getUserSourceIcon(selectedUser)}
                      <span className="text-sm text-gray-600">Local User</span>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Role</Label>
                    <p className="mt-1">{selectedUser.role}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Department</Label>
                    <p className="mt-1">{selectedUser.department || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Job Title</Label>
                    <p className="mt-1">{selectedUser.job_title || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Location</Label>
                    <p className="mt-1">{selectedUser.location || '-'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Phone</Label>
                    <p className="mt-1">{selectedUser.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Last Login</Label>
                    <p className="mt-1">
                      {selectedUser.last_login ? 
                        formatDistanceToNow(new Date(selectedUser.last_login), { addSuffix: true }) : 
                        'Never'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Created</Label>
                    <p className="mt-1">
                      {formatDistanceToNow(new Date(selectedUser.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {selectedUser.ad_synced && selectedUser.ad_last_sync && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Last AD Sync</Label>
                      <p className="mt-1">
                        {formatDistanceToNow(new Date(selectedUser.ad_last_sync), { addSuffix: true })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedUser.ad_groups && selectedUser.ad_groups.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">AD Groups</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedUser.ad_groups.map((group, index) => (
                      <Badge key={index} variant="outline">{group}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-first-name">First Name</Label>
                  <Input
                    id="edit-first-name"
                    value={selectedUser.first_name || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-last-name">Last Name</Label>
                  <Input
                    id="edit-last-name"
                    value={selectedUser.last_name || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={selectedUser.email || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    disabled={selectedUser.ad_synced}
                  />
                  {selectedUser.ad_synced && (
                    <p className="text-xs text-gray-500 mt-1">Email cannot be modified for AD users</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-role">Role</Label>
                  <Select 
                    value={selectedUser.role || 'user'} 
                    onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-department">Department</Label>
                  <Select 
                    value={selectedUser.department || ''} 
                    onValueChange={(value) => setSelectedUser({ ...selectedUser, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IT Department">IT Department</SelectItem>
                      <SelectItem value="HR Department">HR Department</SelectItem>
                      <SelectItem value="Finance Department">Finance Department</SelectItem>
                      <SelectItem value="Operations Department">Operations Department</SelectItem>
                      <SelectItem value="Marketing Department">Marketing Department</SelectItem>
                      <SelectItem value="Sales Department">Sales Department</SelectItem>
                      <SelectItem value="Engineering Department">Engineering Department</SelectItem>
                      <SelectItem value="Support Department">Support Department</SelectItem>
                      <SelectItem value="Legal Department">Legal Department</SelectItem>
                      <SelectItem value="Admin Department">Admin Department</SelectItem>
                      {departments.filter(dept => 
                        !['IT Department', 'HR Department', 'Finance Department', 'Operations Department', 
                          'Marketing Department', 'Sales Department', 'Engineering Department', 
                          'Support Department', 'Legal Department', 'Admin Department'].includes(dept)
                      ).map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select 
                    value={selectedUser.is_active ? "active" : "inactive"} 
                    onValueChange={(value) => setSelectedUser({ ...selectedUser, is_active: value === "active" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateUser}
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </EnhancedErrorBoundary>
  );
}