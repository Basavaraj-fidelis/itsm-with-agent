
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/protected-route";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users as UsersIcon,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  Building,
  UserCheck,
  UserX,
  Calendar,
  AlertTriangle,
  Key,
  Clock,
  Filter,
  Download,
  RefreshCw,
  Settings,
  Lock,
  Unlock,
  BadgeCheck,
  Activity,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  first_name?: string;
  last_name?: string;
  role: string;
  department?: string;
  phone?: string;
  job_title?: string;
  location?: string;
  employee_id?: string;
  manager_id?: string;
  is_active: boolean;
  is_locked?: boolean;
  failed_login_attempts?: number;
  created_at: string;
  last_login?: string;
  last_password_change?: string;
  status?: string;
  security_status?: string;
  permissions?: string[];
  preferences?: Record<string, any>;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  locked: number;
  admins: number;
  technicians: number;
  managers: number;
  end_users: number;
}

const roles = [
  { value: "admin", label: "Administrator", description: "Full system access", color: "bg-red-100 text-red-800" },
  { value: "manager", label: "Manager", description: "Team oversight and reporting", color: "bg-blue-100 text-blue-800" },
  { value: "technician", label: "Technician", description: "Ticket management and resolution", color: "bg-green-100 text-green-800" },
  { value: "user", label: "End User", description: "Submit and view own tickets", color: "bg-gray-100 text-gray-800" },
  { value: "end_user", label: "End User", description: "Submit and view own tickets", color: "bg-gray-100 text-gray-800" },
];

const departments = [
  "IT",
  "Human Resources", 
  "Finance",
  "Marketing",
  "Sales",
  "Operations",
  "Engineering",
  "Support",
  "Legal",
  "Facilities",
];

export default function Users() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total: 0, active: 0, inactive: 0, locked: 0,
    admins: 0, technicians: 0, managers: 0, end_users: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user",
    department: "",
    phone: "",
    password: "",
    employee_id: "",
    job_title: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, selectedRole, selectedDepartment, selectedStatus]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching users with enhanced filters...");

      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (selectedRole && selectedRole !== 'all') params.append('role', selectedRole);
      if (selectedDepartment && selectedDepartment !== 'all') params.append('department', selectedDepartment);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);

      const queryString = params.toString();
      const url = `/api/users${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Enhanced users data received:", result);

      const userData = result.data || result || [];
      setUsers(Array.isArray(userData) ? userData : []);
      
      // Calculate stats
      calculateStats(userData);
      
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const calculateStats = (userData: User[]) => {
    const newStats = {
      total: userData.length,
      active: userData.filter(u => u.is_active && !u.is_locked).length,
      inactive: userData.filter(u => !u.is_active).length,
      locked: userData.filter(u => u.is_locked).length,
      admins: userData.filter(u => u.role === 'admin').length,
      technicians: userData.filter(u => u.role === 'technician').length,
      managers: userData.filter(u => u.role === 'manager').length,
      end_users: userData.filter(u => u.role === 'user' || u.role === 'end_user').length,
    };
    setStats(newStats);
  };

  const createUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...formData,
          role: formData.role === 'user' ? 'end_user' : formData.role
        }),
      });

      if (response.ok) {
        const newUser = await response.json();
        await fetchUsers(); // Refresh the list
        setIsCreateDialogOpen(false);
        resetForm();
        toast({
          title: "User Created",
          description: "New user has been created successfully.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to create user");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async () => {
    if (!selectedUser) return;

    try {
      setIsLoading(true);
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        await fetchUsers(); // Refresh the list
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        resetForm();
        toast({
          title: "User Updated",
          description: "User has been updated successfully.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to update user");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        await fetchUsers(); // Refresh the list
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
        toast({
          title: "User Deleted",
          description: "User has been deleted successfully.",
        });
      } else {
        throw new Error("Failed to delete user");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ ...user, is_active: !user.is_active }),
      });

      if (response.ok) {
        await fetchUsers(); // Refresh the list
        toast({
          title: "User Status Updated",
          description: `User has been ${!user.is_active ? "activated" : "deactivated"}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserLock = async (user: User) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ ...user, is_locked: !user.is_locked }),
      });

      if (response.ok) {
        await fetchUsers(); // Refresh the list
        toast({
          title: "User Lock Status Updated",
          description: `User has been ${!user.is_locked ? "locked" : "unlocked"}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user lock status.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      role: "user",
      department: "",
      phone: "",
      password: "",
      employee_id: "",
      job_title: "",
    });
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || "",
      phone: user.phone || "",
      password: "",
      employee_id: user.employee_id || "",
      job_title: user.job_title || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    const roleConfig = roles.find(r => r.value === role);
    return roleConfig?.color || "bg-gray-100 text-gray-800";
  };

  const getStatusBadge = (user: User) => {
    if (user.is_locked) {
      return <Badge variant="destructive"><Lock className="w-3 h-3 mr-1" />Locked</Badge>;
    }
    if (!user.is_active) {
      return <Badge variant="secondary"><UserX className="w-3 h-3 mr-1" />Inactive</Badge>;
    }
    return <Badge variant="default"><UserCheck className="w-3 h-3 mr-1" />Active</Badge>;
  };

  const getSecurityIndicator = (user: User) => {
    if (user.failed_login_attempts && user.failed_login_attempts > 0) {
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    }
    return null;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Check if current user has admin privileges
  const isAdmin = currentUser?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-neutral-600">
              You need administrator privileges to access user management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[#201F1E] dark:text-[#F3F2F1] mb-2">
            User Management
          </h1>
          <p className="text-neutral-600">
            Comprehensive user administration for ITSM platform
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchUsers} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the ITSM system with appropriate role and permissions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="col-span-3"
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="col-span-3"
                    placeholder="john.doe@company.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="employee_id" className="text-right">Employee ID</Label>
                  <Input
                    id="employee_id"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="col-span-3"
                    placeholder="EMP001"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="job_title" className="text-right">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="col-span-3"
                    placeholder="IT Technician"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="col-span-3"
                    placeholder="Temporary password"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div>
                            <div className="font-medium">{role.label}</div>
                            <div className="text-xs text-neutral-500">{role.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="department" className="text-right">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="col-span-3"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createUser} disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Enhanced Stats and Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-xs text-neutral-500">Total Users</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <div className="text-xs text-neutral-500">Active</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
                <div className="text-xs text-neutral-500">Inactive</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.locked}</div>
                <div className="text-xs text-neutral-500">Locked</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
                <div className="text-xs text-neutral-500">Admins</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.managers}</div>
                <div className="text-xs text-neutral-500">Managers</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.technicians}</div>
                <div className="text-xs text-neutral-500">Technicians</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.end_users}</div>
                <div className="text-xs text-neutral-500">End Users</div>
              </div>
            </Card>
          </div>

          {/* Enhanced Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                  <Input
                    placeholder="Search users by name, email, or employee ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Enhanced Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role & Department</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Loading users...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-neutral-500">
                          <UsersIcon className="w-8 h-8 mx-auto mb-2" />
                          No users found
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-[#0078D4] text-white text-sm">
                                {getUserInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-neutral-500">{user.email}</div>
                              {user.employee_id && (
                                <div className="text-xs text-neutral-400">ID: {user.employee_id}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge className={getRoleBadgeColor(user.role)}>
                              <Shield className="w-3 h-3 mr-1" />
                              {roles.find(r => r.value === user.role)?.label || user.role}
                            </Badge>
                            {(user.department || user.location) && (
                              <div className="flex items-center text-sm">
                                <Building className="w-3 h-3 mr-1 text-neutral-400" />
                                {user.department || user.location || 'Not Set'}
                              </div>
                            )}
                            {user.job_title && (
                              <div className="text-xs text-neutral-500">{user.job_title}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <Mail className="w-3 h-3 mr-1 text-neutral-400" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center text-sm">
                                <Phone className="w-3 h-3 mr-1 text-neutral-400" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getSecurityIndicator(user)}
                            {user.failed_login_attempts && user.failed_login_attempts > 0 && (
                              <span className="text-xs text-orange-600">
                                {user.failed_login_attempts} failed attempts
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1 text-neutral-400" />
                              {formatDate(user.last_login)}
                            </div>
                            <div className="text-xs text-neutral-500">
                              Created: {formatDate(user.created_at)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toggleUserStatus(user)}>
                                {user.is_active ? (
                                  <>
                                    <UserX className="w-4 h-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleUserLock(user)}>
                                {user.is_locked ? (
                                  <>
                                    <Unlock className="w-4 h-4 mr-2" />
                                    Unlock Account
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Lock Account
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(user)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roles.filter((role, index, self) => 
                    self.findIndex(r => r.label === role.label) === index
                  ).map((role) => {
                    const count = users.filter(u => 
                      u.role === role.value || 
                      (role.value === 'end_user' && u.role === 'user')
                    ).length;
                    const percentage = users.length > 0 ? (count / users.length) * 100 : 0;
                    return (
                      <div key={role.value} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${role.color.split(' ')[0]}`}></div>
                          <span className="text-sm font-medium">{role.label}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${role.color.split(' ')[0]}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-8">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departments.map((dept) => {
                    const count = users.filter(u => 
                      u.department === dept || u.location === dept
                    ).length;
                    const percentage = users.length > 0 ? (count / users.length) * 100 : 0;
                    if (count === 0) return null;
                    return (
                      <div key={dept} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{dept}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-8">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-employee_id" className="text-right">Employee ID</Label>
              <Input
                id="edit-employee_id"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-job_title" className="text-right">Job Title</Label>
              <Input
                id="edit-job_title"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-password" className="text-right">Password</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank to keep current"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-neutral-500">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-department" className="text-right">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateUser} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
              All associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
