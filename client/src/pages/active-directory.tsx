import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Server,
  Shield,
  UserCheck,
  Activity,
  Database,
  Link,
  Eye,
  EyeOff,
  Users2,
  Zap,
} from "lucide-react";

interface ADConnectionStatus {
  connected: boolean;
  message: string;
  serverInfo?: {
    version?: string;
    domain?: string;
  };
}

interface ADUser {
  username: string;
  email: string;
  displayName: string;
  department: string;
  groups: string[];
}

interface ADGroup {
  name: string;
  dn: string;
  description: string;
  memberCount: number;
}

export default function ActiveDirectory() {
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<ADConnectionStatus | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncUsername, setSyncUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // AD Configuration
  const [adConfig, setAdConfig] = useState({
    enabled: false,
    server: "192.168.1.195",
    port: "389",
    baseDN: "DC=fidelisgroup,DC=local",
    bindDN: "CN=test,CN=Users,DC=fidelisgroup,DC=local",
    bindPassword: "Fidelis@123",
    userFilter: "(sAMAccountName={{username}})",
    groupFilter: "(objectClass=group)",
    useTLS: false,
    timeout: "30"
  });

  const [syncedUsers, setSyncedUsers] = useState<ADUser[]>([]);
  const [availableGroups, setAvailableGroups] = useState<ADGroup[]>([]);

  const updateConfig = (key: string, value: string | boolean) => {
    setAdConfig(prev => ({ ...prev, [key]: value }));
  };

  const saveConfiguration = async () => {
    try {
      const response = await fetch("/api/ad/configure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(adConfig),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      setIsConfigured(true);
      toast({
        title: "Configuration Saved",
        description: "Active Directory configuration has been saved successfully",
      });
    } catch (error) {
      console.error("AD configuration save error:", error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save AD configuration",
        variant: "destructive",
      });
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await fetch("/api/ad/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(adConfig),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setConnectionStatus(result);

      toast({
        title: result.connected ? "Connection Successful" : "Connection Failed",
        description: result.message,
        variant: result.connected ? "default" : "destructive",
      });
    } catch (error) {
      console.error("AD connection test error:", error);
      const errorResult = {
        connected: false,
        message: error instanceof Error ? error.message : "Unable to test AD connection",
      };
      setConnectionStatus(errorResult);

      toast({
        title: "Test Failed",
        description: errorResult.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const syncUser = async () => {
    if (!syncUsername.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter a username to sync",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch("/api/ad/sync-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ username: syncUsername }),
      });

      const result = await response.json();

      toast({
        title: "User Sync",
        description: result.message || (response.ok ? "User synced successfully" : "Sync failed"),
        variant: response.ok ? "default" : "destructive",
      });

      if (response.ok && result.user) {
        setSyncedUsers(prev => [...prev, result.user]);
        setSyncUsername("");
      }
    } catch (error) {
      console.error("User sync error:", error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Unable to sync user from AD",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const syncAllUsers = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/ad/sync-all-users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      const result = await response.json();

      toast({
        title: "Bulk Sync Complete",
        description: `Synced ${result.syncedCount || 0} users from Active Directory`,
      });

      if (result.users) {
        setSyncedUsers(result.users);
      }
    } catch (error) {
      toast({
        title: "Bulk Sync Failed",
        description: "Unable to sync all users from AD",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch("/api/ad/groups", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const groups = await response.json();
      setAvailableGroups(groups);
    } catch (error) {
      console.error("Failed to load AD groups:", error);
      toast({
        title: "Groups Load Failed",
        description: "Unable to load Active Directory groups",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (connectionStatus?.connected) {
      loadGroups();
    }
  }, [connectionStatus]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Directory Integration</h1>
          <p className="text-muted-foreground">
            Configure and manage Active Directory authentication and user synchronization
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {connectionStatus?.connected && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </div>

      {/* AD Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Active Directory Configuration</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure your Active Directory server connection settings
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Active Directory</Label>
              <p className="text-sm text-muted-foreground">
                Enable AD authentication and user synchronization
              </p>
            </div>
            <Switch
              checked={adConfig.enabled}
              onCheckedChange={(checked) => updateConfig("enabled", checked)}
            />
          </div>

          {adConfig.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ad-server">AD Server</Label>
                  <Input
                    id="ad-server"
                    placeholder="domain-controller.company.com"
                    value={adConfig.server}
                    onChange={(e) => updateConfig("server", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ad-port">Port</Label>
                  <Input
                    id="ad-port"
                    placeholder="389"
                    value={adConfig.port}
                    onChange={(e) => updateConfig("port", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ad-base-dn">Base DN</Label>
                <Input
                  id="ad-base-dn"
                  placeholder="OU=Users,DC=company,DC=com"
                  value={adConfig.baseDN}
                  onChange={(e) => updateConfig("baseDN", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ad-bind-dn">Service Account DN</Label>
                  <Input
                    id="ad-bind-dn"
                    placeholder="CN=service-account,OU=Service Accounts,DC=company,DC=com"
                    value={adConfig.bindDN}
                    onChange={(e) => updateConfig("bindDN", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ad-bind-password">Service Account Password</Label>
                  <div className="relative">
                    <Input
                      id="ad-bind-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={adConfig.bindPassword}
                      onChange={(e) => updateConfig("bindPassword", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-filter">User Search Filter</Label>
                  <Input
                    id="user-filter"
                    placeholder="(sAMAccountName={{username}})"
                    value={adConfig.userFilter}
                    onChange={(e) => updateConfig("userFilter", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-filter">Group Search Filter</Label>
                  <Input
                    id="group-filter"
                    placeholder="(objectClass=group)"
                    value={adConfig.groupFilter}
                    onChange={(e) => updateConfig("groupFilter", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Use TLS/SSL</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable secure connection to AD server
                  </p>
                </div>
                <Switch
                  checked={adConfig.useTLS}
                  onCheckedChange={(checked) => updateConfig("useTLS", checked)}
                />
              </div>

              <div className="flex space-x-2">
                <Button onClick={saveConfiguration} className="flex-1">
                  <Database className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
                <Button
                  onClick={testConnection}
                  disabled={isTestingConnection}
                  variant="outline"
                  className="flex-1"
                >
                  {isTestingConnection ? (
                    <Activity className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Connection Status */}
      {connectionStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="w-5 h-5" />
              <span>Connection Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              {connectionStatus.connected ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <p className="font-medium">
                  {connectionStatus.connected ? "Connected to Active Directory" : "Connection Failed"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {connectionStatus.message}
                </p>
                {connectionStatus.serverInfo && (
                  <p className="text-xs text-muted-foreground">
                    Domain: {connectionStatus.serverInfo.domain} | Version: {connectionStatus.serverInfo.version}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Synchronization */}
      {connectionStatus?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>User Synchronization</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sync users and groups from Active Directory to the ITSM system
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter username to sync (e.g., john.doe)"
                  value={syncUsername}
                  onChange={(e) => setSyncUsername(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && syncUser()}
                />
              </div>
              <Button onClick={syncUser} disabled={isSyncing}>
                {isSyncing ? (
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4 mr-2" />
                )}
                Sync User
              </Button>
              <Button onClick={syncAllUsers} disabled={isSyncing} variant="outline">
                {isSyncing ? (
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Sync All Users
              </Button>
            </div>

            {/* Sync Schedule Configuration */}
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label>Automatic Sync Schedule</Label>
                <Select defaultValue="manual">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Only</SelectItem>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily at 2 AM</SelectItem>
                    <SelectItem value="weekly">Weekly on Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Last Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Never synchronized
                </p>
              </div>
            </div>

            {syncedUsers.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Recently Synced Users</h4>
                  <Badge variant="outline">{syncedUsers.length} users}</Badge>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {syncedUsers.slice(-10).map((user, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border rounded">
                      <div className="flex-1">
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.department || "No Department"} • {user.role}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          AD Synced
                        </Badge>
                        <Badge 
                          variant={user.role === 'admin' ? 'destructive' : 
                                 user.role === 'technician' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync History */}
      {connectionStatus?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Synchronization History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Manual Sync - All Users</p>
                  <p className="text-sm text-muted-foreground">
                    Synced 25 users, 3 new, 2 updated
                  </p>
                  <p className="text-xs text-muted-foreground">
                    2 minutes ago by admin@company.com
                  </p>
                </div>
                <Badge variant="default">Success</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Scheduled Sync - Daily</p>
                  <p className="text-sm text-muted-foreground">
                    Synced 25 users, 0 new, 1 updated
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Yesterday at 2:00 AM
                  </p>
                </div>
                <Badge variant="default">Success</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Manual Sync - Single User</p>
                  <p className="text-sm text-muted-foreground">
                    Connection timeout to domain controller
                  </p>
                  <p className="text-xs text-muted-foreground">
                    3 days ago by tech@company.com
                  </p>
                </div>
                <Badge variant="destructive">Failed</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Group Mappings */}
      {connectionStatus?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users2 className="w-5 h-5" />
              <span>AD Group to Role Mappings</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure how Active Directory groups map to ITSM roles
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">IT-team</p>
                  <p className="text-sm text-muted-foreground">
                    CN=IT-team,OU=Groups,DC=company,DC=com
                  </p>
                </div>
                <Badge variant="destructive">Administrator</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Finance-team</p>
                  <p className="text-sm text-muted-foreground">
                    CN=Finance-team,OU=Groups,DC=company,DC=com
                  </p>
                </div>
                <Badge variant="outline">End User</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">HR-team</p>
                  <p className="text-sm text-muted-foreground">
                    CN=HR-team,OU=Groups,DC=company,DC=com
                  </p>
                </div>
                <Badge variant="outline">End User</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">IT-Support</p>
                  <p className="text-sm text-muted-foreground">
                    CN=IT-Support,OU=Groups,DC=company,DC=com
                  </p>
                </div>
                <Badge variant="secondary">Technician</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Department-Managers</p>
                  <p className="text-sm text-muted-foreground">
                    Any group containing "manager" or "lead"
                  </p>
                </div>
                <Badge variant="default">Manager</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Default (No Group Match)</p>
                  <p className="text-sm text-muted-foreground">
                    Users not in any mapped AD group
                  </p>
                </div>
                <Badge variant="outline">End User</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Configuration Guide</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Prepare Active Directory</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Create a dedicated service account for ITSM integration</li>
                <li>• Grant the service account read permissions on user and group objects</li>
                <li>• Ensure the service account can authenticate users via LDAP bind</li>
                <li>• Configure appropriate security groups for role mapping</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">2. Required Information</h4>
              <div className="bg-muted p-4 rounded text-sm space-y-2">
                <div><strong>Server:</strong> Your domain controller FQDN (e.g., dc01.company.com)</div>
                <div><strong>Port:</strong> 389 (LDAP) or 636 (LDAPS)</div>
                <div><strong>Base DN:</strong> The search base for users (e.g., OU=Users,DC=company,DC=com)</div>
                <div><strong>Service Account DN:</strong> Full DN of service account</div>
                <div><strong>Service Account Password:</strong> Password for the service account</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">3. Security Groups for Role Mapping</h4>
              <div className="space-y-2">
                <div className="p-3 border rounded">
                  <p className="font-medium">ITSM-Admins</p>
                  <p className="text-sm text-muted-foreground">Full system administrator access</p>
                </div>
                <div className="p-3 border rounded">
                  <p className="font-medium">ITSM-Managers</p>
                  <p className="text-sm text-muted-foreground">Department managers and supervisors</p>
                </div>
                <div className="p-3 border rounded">
                  <p className="font-medium">ITSM-Technicians</p>
                  <p className="text-sm text-muted-foreground">IT support technicians and specialists</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">4. Testing Connection</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Verify network connectivity to the domain controller</li>
                <li>• Test service account credentials</li>
                <li>• Confirm LDAP search base is accessible</li>
                <li>• Validate user search filters work correctly</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">5. User Synchronization</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Sync individual users by username for testing</li>
                <li>• Use bulk sync to import all users from specified OU</li>
                <li>• Group memberships automatically determine user roles</li>
                <li>• Users without mapped groups get "End User" role by default</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">6. Best Practices</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Use a dedicated service account with minimal required permissions</li>
                <li>• Enable TLS/SSL for secure communication</li>
                <li>• Regularly test the connection to ensure it remains active</li>
                <li>• Monitor sync logs for any authentication or permission issues</li>
                <li>• Schedule periodic user synchronization to keep roles updated</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}