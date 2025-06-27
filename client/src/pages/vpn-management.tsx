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
  Wifi,
  Shield,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Activity,
  Download,
  Upload,
  Network,
} from "lucide-react";

interface VPNConnection {
  id: string;
  name: string;
  server: string;
  port: number;
  protocol: 'OpenVPN' | 'IKEv2' | 'L2TP' | 'PPTP' | 'WireGuard';
  username: string;
  password: string;
  certificate?: string;
  privateKey?: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  autoConnect: boolean;
  description: string;
  created_at: string;
  last_connected?: string;
}

const getProtocolConfig = (protocol: string) => {
  switch (protocol) {
    case "OpenVPN":
      return { defaultPort: 1194, description: "Secure and versatile, requires certificates." };
    case "WireGuard":
      return { defaultPort: 51820, description: "Modern and fast, with simple configuration." };
    case "IKEv2":
      return { defaultPort: 500, description: "Fast reconnection, good for mobile." };
    case "L2TP":
      return { defaultPort: 1701, description: "Good compatibility, moderate security." };
    case "PPTP":
      return { defaultPort: 1723, description: "Deprecated, use with caution." };
    default:
      return { defaultPort: 1194, description: "Secure and versatile, requires certificates." };
  }
};

export default function VPNManagement() {
  const { toast } = useToast();
  const [vpnConnections, setVpnConnections] = useState<VPNConnection[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingConnection, setEditingConnection] = useState<VPNConnection | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  // Form state for creating/editing VPN connections
  const [formData, setFormData] = useState({
    name: "",
    server: "",
    port: 1194,
    protocol: "OpenVPN" as const,
    username: "",
    password: "",
    certificate: "",
    privateKey: "",
    preSharedKey: "",
    peerPublicKey: "",
    peerEndpoint: "",
    allowedIPs: "",
    autoConnect: false,
    description: "",
    tags: "",
  });

  const updateFormData = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      server: "",
      port: 1194,
      protocol: "OpenVPN",
      username: "",
      password: "",
      certificate: "",
      privateKey: "",
      preSharedKey: "",
      peerPublicKey: "",
      peerEndpoint: "",
      allowedIPs: "",
      autoConnect: false,
      description: "",
      tags: "",
    });
    setIsCreating(false);
    setEditingConnection(null);
  };

  const loadVPNConnections = async () => {
    try {
      const response = await fetch("/api/vpn/connections", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      if (response.ok) {
        const connections = await response.json();
        setVpnConnections(connections);
      }
    } catch (error) {
      console.error("Failed to load VPN connections:", error);
    }
  };

  const saveVPNConnection = async () => {
    try {
      const url = editingConnection 
        ? `/api/vpn/connections/${editingConnection.id}`
        : "/api/vpn/connections";

      const method = editingConnection ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: editingConnection ? "VPN Updated" : "VPN Created",
          description: `VPN connection "${formData.name}" has been ${editingConnection ? 'updated' : 'created'} successfully`,
        });
        resetForm();
        loadVPNConnections();
      } else {
        throw new Error("Failed to save VPN connection");
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save VPN connection",
        variant: "destructive",
      });
    }
  };

  const connectVPN = async (connectionId: string) => {
    setIsConnecting(connectionId);
    try {
      const response = await fetch(`/api/vpn/connect/${connectionId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "VPN Connected",
          description: result.message || "Successfully connected to VPN",
        });
        
        // Show connection details if available
        if (result.details) {
          console.log("VPN Connection Details:", result.details);
        }
        
        loadVPNConnections();
      } else {
        // Update connection status to error
        setVpnConnections(prev => 
          prev.map(conn => 
            conn.id === connectionId 
              ? { ...conn, status: 'error' as const }
              : conn
          )
        );
        
        throw new Error(result.message || "Failed to connect");
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to VPN",
        variant: "destructive",
      });
      
      // Update local state to show error
      setVpnConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, status: 'error' as const }
            : conn
        )
      );
    } finally {
      setIsConnecting(null);
    }
  };

  const disconnectVPN = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/vpn/disconnect/${connectionId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "VPN Disconnected",
          description: result.message || "Successfully disconnected from VPN",
        });
        loadVPNConnections();
      } else {
        throw new Error(result.message || "Failed to disconnect");
      }
    } catch (error) {
      toast({
        title: "Disconnection Failed",
        description: error instanceof Error ? error.message : "Failed to disconnect from VPN",
        variant: "destructive",
      });
    }
  };

  const editConnection = (connection: VPNConnection) => {
    setFormData({
      name: connection.name,
      server: connection.server,
      port: connection.port,
      protocol: connection.protocol,
      username: connection.username,
      password: connection.password,
      certificate: connection.certificate || "",
      privateKey: connection.privateKey || "",
      preSharedKey: "",
      peerPublicKey: "",
      peerEndpoint: "",
      allowedIPs: "",
      autoConnect: connection.autoConnect,
      description: connection.description,
      tags: "",
    });
    setEditingConnection(connection);
    setIsCreating(true);
  };

  const deleteConnection = async (connectionId: string) => {
    if (!confirm("Are you sure you want to delete this VPN connection?")) return;

    try {
      const response = await fetch(`/api/vpn/connections/${connectionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      if (response.ok) {
        toast({
          title: "VPN Deleted",
          description: "VPN connection has been deleted successfully",
        });
        loadVPNConnections();
      } else {
        throw new Error("Failed to delete VPN connection");
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete VPN connection",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadVPNConnections();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">VPN Management</h1>
          <p className="text-muted-foreground">
            Configure and manage VPN connections for secure remote access
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add VPN Connection</span>
        </Button>
      </div>

      {/* VPN Connection Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>{editingConnection ? 'Edit VPN Connection' : 'Create New VPN Connection'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vpn-name">Connection Name</Label>
                <Input
                  id="vpn-name"
                  placeholder="Company VPN"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vpn-protocol">Protocol</Label>
                <Select 
                  value={formData.protocol} 
                  onValueChange={(value) => {
                    const config = getProtocolConfig(value);
                    updateFormData("protocol", value);
                    updateFormData("port", config.defaultPort);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OpenVPN">OpenVPN</SelectItem>
                    <SelectItem value="WireGuard">WireGuard</SelectItem>
                    <SelectItem value="IKEv2">IKEv2</SelectItem>
                    <SelectItem value="L2TP">L2TP/IPSec</SelectItem>
                    <SelectItem value="PPTP">PPTP (Deprecated)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getProtocolConfig(formData.protocol).description}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vpn-server">VPN Server</Label>
                <Input
                  id="vpn-server"
                  placeholder="vpn.fidelisgroup.local or 192.168.1.195"
                  value={formData.server}
                  onChange={(e) => updateFormData("server", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vpn-port">Port</Label>
                <Input
                  id="vpn-port"
                  type="number"
                  placeholder="1194"
                  value={formData.port}
                  onChange={(e) => updateFormData("port", parseInt(e.target.value) || 1194)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vpn-username">Username</Label>
                <Input
                  id="vpn-username"
                  placeholder="your-username"
                  value={formData.username}
                  onChange={(e) => updateFormData("username", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vpn-password">Password</Label>
                <div className="relative">
                  <Input
                    id="vpn-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => updateFormData("password", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {(formData.protocol === 'OpenVPN' || formData.protocol === 'IKEv2') && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vpn-certificate">Certificate (Optional)</Label>
                  <Textarea
                    id="vpn-certificate"
                    placeholder="-----BEGIN CERTIFICATE-----"
                    value={formData.certificate}
                    onChange={(e) => updateFormData("certificate", e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vpn-private-key">Private Key (Optional)</Label>
                  <Textarea
                    id="vpn-private-key"
                    placeholder="-----BEGIN PRIVATE KEY-----"
                    value={formData.privateKey}
                    onChange={(e) => updateFormData("privateKey", e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            )}

            {formData.protocol === 'WireGuard' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vpn-peer-public-key">Peer Public Key</Label>
                    <Input
                      id="vpn-peer-public-key"
                      placeholder="Public key of the VPN server"
                      value={formData.peerPublicKey}
                      onChange={(e) => updateFormData("peerPublicKey", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vpn-pre-shared-key">Preshared Key (Optional)</Label>
                    <Input
                      id="vpn-pre-shared-key"
                      placeholder="Optional preshared key for extra security"
                      value={formData.preSharedKey}
                      onChange={(e) => updateFormData("preSharedKey", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vpn-peer-endpoint">Peer Endpoint</Label>
                  <Input
                    id="vpn-peer-endpoint"
                    placeholder="Endpoint IP address and port of the VPN server"
                    value={formData.peerEndpoint}
                    onChange={(e) => updateFormData("peerEndpoint", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vpn-allowed-ips">Allowed IPs</Label>
                  <Input
                    id="vpn-allowed-ips"
                    placeholder="Comma-separated list of IPs allowed through the tunnel (e.g., 0.0.0.0/0)"
                    value={formData.allowedIPs}
                    onChange={(e) => updateFormData("allowedIPs", e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="vpn-description">Description</Label>
              <Textarea
                id="vpn-description"
                placeholder="VPN connection for accessing company resources"
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Connect</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically connect when the application starts
                </p>
              </div>
              <Switch
                checked={formData.autoConnect}
                onCheckedChange={(checked) => updateFormData("autoConnect", checked)}
              />
            </div>

            <div className="flex space-x-2">
              <Button onClick={saveVPNConnection} className="flex-1">
                <Shield className="w-4 h-4 mr-2" />
                {editingConnection ? 'Update Connection' : 'Create Connection'}
              </Button>
              <Button onClick={resetForm} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* VPN Connections List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Network className="w-5 h-5" />
            <span>VPN Connections</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vpnConnections.length === 0 ? (
            <div className="text-center py-8">
              <Wifi className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No VPN connections configured</p>
              <p className="text-sm text-gray-400">Create your first VPN connection to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vpnConnections.map((connection) => (
                <div key={connection.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium">{connection.name}</h3>
                        <Badge 
                          variant={
                            connection.status === 'connected' ? 'default' :
                            connection.status === 'connecting' ? 'secondary' :
                            connection.status === 'error' ? 'destructive' : 'outline'
                          }
                          className="flex items-center space-x-1"
                        >
                          {connection.status === 'connected' && <CheckCircle className="w-3 h-3" />}
                          {connection.status === 'connecting' && <Activity className="w-3 h-3 animate-spin" />}
                          {connection.status === 'error' && <AlertCircle className="w-3 h-3" />}
                          <span className="capitalize">{connection.status}</span>
                        </Badge>
                        <Badge variant="outline">{connection.protocol}</Badge>
                        {connection.autoConnect && <Badge variant="secondary">Auto Connect</Badge>}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <p><strong>Server:</strong> {connection.server}:{connection.port}</p>
                          <p><strong>Username:</strong> {connection.username}</p>
                        </div>
                        <div>
                          <p><strong>Created:</strong> {new Date(connection.created_at).toLocaleDateString()}</p>
                          {connection.last_connected && (
                            <p><strong>Last Connected:</strong> {new Date(connection.last_connected).toLocaleString()}</p>
                          )}
                        </div>
                      </div>

                      {connection.description && (
                        <p className="text-sm text-muted-foreground mt-2">{connection.description}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {connection.status === 'connected' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => disconnectVPN(connection.id)}
                        >
                          <Globe className="w-4 h-4 mr-1" />
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => connectVPN(connection.id)}
                          disabled={isConnecting === connection.id}
                        >
                          {isConnecting === connection.id ? (
                            <Activity className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Shield className="w-4 h-4 mr-1" />
                          )}
                          Connect
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editConnection(connection)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteConnection(connection.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* VPN Configuration Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>VPN Configuration Guide</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Fidelis Group Network Access</h4>
            <div className="bg-blue-50 p-4 rounded text-sm space-y-2">
              <p><strong>Server:</strong> 192.168.1.195 (fidelisgroup.local)</p>
              <p><strong>Protocol:</strong> Use IKEv2 or L2TP for Windows, OpenVPN for cross-platform</p>
              <p><strong>Authentication:</strong> Use your domain credentials</p>
              <p><strong>Purpose:</strong> Required for Active Directory integration and internal resource access</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Protocol Recommendations</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 border rounded">
                <p className="font-medium">OpenVPN</p>
                <p className="text-muted-foreground">Most secure, works on all platforms, requires certificates</p>
              </div>
              <div className="p-3 border rounded">
                <p className="font-medium">IKEv2</p>
                <p className="text-muted-foreground">Native Windows support, fast reconnection, good for mobile</p>
              </div>
              <div className="p-3 border rounded">
                <p className="font-medium">L2TP/IPSec</p>
                <p className="text-muted-foreground">Widely supported, good compatibility, moderate security</p>
              </div>
              <div className="p-3 border rounded">
                <p className="font-medium">WireGuard</p>
                <p className="text-muted-foreground">Modern, fast, simple configuration, excellent performance</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Security Best Practices</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Use strong authentication credentials</li>
              <li>• Enable auto-disconnect when not in use</li>
              <li>• Regularly update VPN client software</li>
              <li>• Use certificate-based authentication when possible</li>
              <li>• Monitor VPN connection logs for unusual activity</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}