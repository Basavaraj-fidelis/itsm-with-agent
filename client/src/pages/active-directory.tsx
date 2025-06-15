
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Settings,
  CheckCircle,
  AlertCircle,
  Sync,
  Search,
  Server,
  Shield,
  UserCheck,
  Activity,
} from "lucide-react";

export default function ActiveDirectory() {
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    message: string;
  } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncUsername, setSyncUsername] = useState("");

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await fetch("/api/ad/test-connection", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      const result = await response.json();
      setConnectionStatus(result);
      
      toast({
        title: result.connected ? "Connection Successful" : "Connection Failed",
        description: result.message,
        variant: result.connected ? "default" : "destructive",
      });
    } catch (error) {
      const errorResult = {
        connected: false,
        message: "Unable to test AD connection",
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
        description: result.message,
        variant: response.ok ? "default" : "destructive",
      });
      
      if (response.ok) {
        setSyncUsername("");
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Unable to sync user from AD",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Test connection on page load
    testConnection();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Directory</h1>
          <p className="text-muted-foreground">
            Manage Active Directory integration and user synchronization
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="w-5 h-5" />
            <span>Connection Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {connectionStatus?.connected ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <p className="font-medium">
                  {connectionStatus?.connected ? "Connected" : "Disconnected"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {connectionStatus?.message || "Testing connection..."}
                </p>
              </div>
            </div>
            <Button
              onClick={testConnection}
              disabled={isTestingConnection}
              variant="outline"
            >
              {isTestingConnection ? (
                <Activity className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Synchronization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sync className="w-5 h-5" />
            <span>User Synchronization</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manually sync users from Active Directory to the ITSM system
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Enter username to sync"
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
          </div>
        </CardContent>
      </Card>

      {/* Authentication Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Authentication Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Authentication Method</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Active Directory</Badge>
                <Badge variant="outline">Local Database</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default Role Assignment</Label>
              <Badge variant="outline">End User</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Group Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
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
                <p className="font-medium">ITSM-Admins</p>
                <p className="text-sm text-muted-foreground">
                  CN=ITSM-Admins,OU=Groups,DC=company,DC=com
                </p>
              </div>
              <Badge variant="destructive">Administrator</Badge>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <p className="font-medium">ITSM-Managers</p>
                <p className="text-sm text-muted-foreground">
                  CN=ITSM-Managers,OU=Groups,DC=company,DC=com
                </p>
              </div>
              <Badge variant="default">Manager</Badge>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <p className="font-medium">ITSM-Technicians</p>
                <p className="text-sm text-muted-foreground">
                  CN=ITSM-Technicians,OU=Groups,DC=company,DC=com
                </p>
              </div>
              <Badge variant="secondary">Technician</Badge>
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

      {/* Configuration Help */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Configuration Guide</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Environment Variables Required:</h4>
            <div className="bg-muted p-3 rounded text-sm font-mono space-y-1">
              <div>AD_URL=ldap://your-domain-controller.company.com:389</div>
              <div>AD_BIND_DN=CN=service-account,OU=Service Accounts,DC=company,DC=com</div>
              <div>AD_BIND_PASSWORD=your-service-account-password</div>
              <div>AD_SEARCH_BASE=OU=Users,DC=company,DC=com</div>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Service Account Requirements:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Read access to user objects in the specified search base</li>
              <li>• Ability to authenticate users via LDAP bind</li>
              <li>• Access to group membership information</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
