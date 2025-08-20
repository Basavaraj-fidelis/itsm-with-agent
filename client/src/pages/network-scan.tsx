
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Download, 
  Play, 
  BarChart3, 
  Network, 
  Monitor, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Filter,
  RefreshCw
} from 'lucide-react';

interface NetworkScanResult {
  id: string;
  ip: string;
  hostname?: string;
  os?: string;
  mac_address?: string;
  status: 'online' | 'offline';
  last_seen: Date;
  subnet: string;
  device_type?: string;
  ports_open?: number[];
  response_time?: number;
}

interface ScanSession {
  id: string;
  initiated_by: string;
  started_at: Date;
  completed_at?: Date;
  status: 'running' | 'completed' | 'failed';
  total_discovered: number;
  subnets_scanned: string[];
  scanning_agents: { subnet: string; agent_id: string; hostname: string }[];
}

export default function NetworkScan() {
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ScanSession | null>(null);
  const [scanResults, setScanResults] = useState<NetworkScanResult[]>([]);
  const [availableAgents, setAvailableAgents] = useState<any>(null);
  const [defaultSubnets, setDefaultSubnets] = useState<any[]>([]);
  const [selectedSubnets, setSelectedSubnets] = useState<string[]>([]);
  const [scanType, setScanType] = useState<'ping' | 'port' | 'full'>('ping');
  const [customIPRanges, setCustomIPRanges] = useState<string[]>(['']);
  const [scanMode, setScanMode] = useState<'subnet' | 'custom'>('subnet');
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subnetFilter, setSubnetFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadScanSessions(),
        loadAvailableAgents(),
        loadDefaultSubnets()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: "Error",
        description: "Failed to load network scan data",
        variant: "destructive",
      });
    }
  };

  const loadScanSessions = async () => {
    try {
      const response = await fetch('/api/network-scan/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        
        // Auto-select the most recent session
        if (data.length > 0) {
          const latest = data.sort((a: ScanSession, b: ScanSession) => 
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
          )[0];
          setCurrentSession(latest);
          loadScanResults(latest.id);
        }
      }
    } catch (error) {
      console.error('Error loading scan sessions:', error);
    }
  };

  const loadAvailableAgents = async () => {
    try {
      const response = await fetch('/api/network-scan/agents');
      if (response.ok) {
        const data = await response.json();
        setAvailableAgents(data);
      }
    } catch (error) {
      console.error('Error loading available agents:', error);
    }
  };

  const loadDefaultSubnets = async () => {
    try {
      const response = await fetch('/api/network-scan/subnets');
      if (response.ok) {
        const data = await response.json();
        setDefaultSubnets(data);
        setSelectedSubnets(data.map((s: any) => s.range));
      }
    } catch (error) {
      console.error('Error loading default subnets:', error);
    }
  };

  const loadScanResults = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/network-scan/sessions/${sessionId}/results`);
      if (response.ok) {
        const data = await response.json();
        setScanResults(data);
      }
    } catch (error) {
      console.error('Error loading scan results:', error);
    }
  };

  const initiateScan = async () => {
    // Validate input based on scan mode
    if (scanMode === 'subnet' && selectedSubnets.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one subnet to scan",
        variant: "destructive",
      });
      return;
    }

    if (scanMode === 'custom') {
      const validRanges = customIPRanges.filter(range => range.trim() !== '');
      if (validRanges.length === 0) {
        toast({
          title: "Error",
          description: "Please enter at least one IP range to scan",
          variant: "destructive",
        });
        return;
      }
    }

    setIsScanning(true);
    try {
      const requestBody: any = {
        scan_type: scanType,
      };

      if (scanMode === 'subnet') {
        requestBody.subnets = selectedSubnets;
      } else {
        requestBody.custom_ip_ranges = customIPRanges.filter(range => range.trim() !== '');
      }

      const response = await fetch('/api/network-scan/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        const targetCount = scanMode === 'subnet' ? selectedSubnets.length : customIPRanges.filter(r => r.trim()).length;
        toast({
          title: "Scan Initiated",
          description: `Network scan started for ${targetCount} ${scanMode === 'subnet' ? 'subnet(s)' : 'IP range(s)'}`,
        });

        // Refresh sessions and set current session
        await loadScanSessions();
        
        // Poll for completion
        pollScanProgress(data.session_id);
      } else {
        throw new Error('Failed to initiate scan');
      }
    } catch (error) {
      console.error('Error initiating scan:', error);
      toast({
        title: "Error",
        description: "Failed to initiate network scan",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const pollScanProgress = async (sessionId: string) => {
    const checkProgress = async () => {
      try {
        const response = await fetch(`/api/network-scan/sessions/${sessionId}`);
        if (response.ok) {
          const session = await response.json();
          setCurrentSession(session);
          
          if (session.status === 'completed') {
            await loadScanResults(sessionId);
            await loadScanSessions();
            toast({
              title: "Scan Completed",
              description: `Discovered ${session.total_discovered} devices`,
            });
            return;
          } else if (session.status === 'failed') {
            toast({
              title: "Scan Failed",
              description: "Network scan encountered an error",
              variant: "destructive",
            });
            return;
          }
          
          // Continue polling if still running
          setTimeout(checkProgress, 2000);
        }
      } catch (error) {
        console.error('Error polling scan progress:', error);
      }
    };

    checkProgress();
  };

  const exportResults = async () => {
    if (!currentSession) return;

    try {
      const response = await fetch(`/api/network-scan/sessions/${currentSession.id}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `network-scan-${currentSession.id}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
          title: "Export Complete",
          description: "Scan results exported successfully",
        });
      }
    } catch (error) {
      console.error('Error exporting results:', error);
      toast({
        title: "Error",
        description: "Failed to export scan results",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDeviceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Workstation': 'bg-blue-100 text-blue-800',
      'Server': 'bg-purple-100 text-purple-800',
      'Printer': 'bg-green-100 text-green-800',
      'Router': 'bg-orange-100 text-orange-800',
      'Switch': 'bg-yellow-100 text-yellow-800',
      'IoT Device': 'bg-pink-100 text-pink-800',
      'Mobile Device': 'bg-indigo-100 text-indigo-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const filteredResults = scanResults.filter(result => {
    const matchesSearch = !searchTerm || 
      result.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.os?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || result.status === statusFilter;
    const matchesSubnet = subnetFilter === 'all' || result.subnet === subnetFilter;
    
    return matchesSearch && matchesStatus && matchesSubnet;
  });

  const getSubnetStats = () => {
    const stats: Record<string, { total: number; online: number }> = {};
    
    scanResults.forEach(result => {
      if (!stats[result.subnet]) {
        stats[result.subnet] = { total: 0, online: 0 };
      }
      stats[result.subnet].total++;
      if (result.status === 'online') {
        stats[result.subnet].online++;
      }
    });
    
    return stats;
  };

  const getOSStats = () => {
    const stats: Record<string, number> = {};
    scanResults.forEach(result => {
      const os = result.os || 'Unknown';
      stats[os] = (stats[os] || 0) + 1;
    });
    return stats;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Network Scan</h1>
          <p className="text-muted-foreground">
            Discover and monitor devices across your network infrastructure
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadInitialData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {currentSession && scanResults.length > 0 && (
            <Button onClick={exportResults} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="scan" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scan">Scan Configuration</TabsTrigger>
          <TabsTrigger value="results">Scan Results</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Network Scan Configuration
              </CardTitle>
              <CardDescription>
                Configure and initiate network scans using available agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scan-type">Scan Type</Label>
                  <Select value={scanType} onValueChange={(value: any) => setScanType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scan type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ping">Ping Scan (Fast)</SelectItem>
                      <SelectItem value="port">Port Scan (Medium)</SelectItem>
                      <SelectItem value="full">Full Scan (Comprehensive)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Available Agents</Label>
                  <div className="text-sm text-muted-foreground">
                    {availableAgents ? (
                      `${availableAgents.total_agents} agents online across ${Object.keys(availableAgents.agents_by_subnet).length} subnets`
                    ) : (
                      'Loading agents...'
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Scan Mode</Label>
                  <Select value={scanMode} onValueChange={(value: any) => setScanMode(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scan mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subnet">Predefined Subnets</SelectItem>
                      <SelectItem value="custom">Custom IP Ranges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scanMode === 'subnet' && (
                  <div className="space-y-2">
                    <Label>Network Subnets to Scan</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {defaultSubnets.map((subnet) => (
                        <div key={subnet.range} className="flex items-center space-x-2">
                          <Checkbox
                            id={subnet.range}
                            checked={selectedSubnets.includes(subnet.range)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSubnets([...selectedSubnets, subnet.range]);
                              } else {
                                setSelectedSubnets(selectedSubnets.filter(s => s !== subnet.range));
                              }
                            }}
                          />
                          <Label htmlFor={subnet.range} className="text-sm">
                            {subnet.range}
                            <div className="text-xs text-muted-foreground">
                              e.g., {subnet.example}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {scanMode === 'custom' && (
                  <div className="space-y-2">
                    <Label>Custom IP Ranges</Label>
                    <div className="space-y-2">
                      {customIPRanges.map((range, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder="Enter IP range (e.g., 192.168.1.0/24 or 192.168.1.1-192.168.1.100)"
                            value={range}
                            onChange={(e) => {
                              const newRanges = [...customIPRanges];
                              newRanges[index] = e.target.value;
                              setCustomIPRanges(newRanges);
                            }}
                            className="flex-1"
                          />
                          {customIPRanges.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newRanges = customIPRanges.filter((_, i) => i !== index);
                                setCustomIPRanges(newRanges);
                              }}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomIPRanges([...customIPRanges, ''])}
                      >
                        Add IP Range
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>Supported formats:</p>
                      <ul className="list-disc list-inside ml-2">
                        <li>CIDR notation: 192.168.1.0/24</li>
                        <li>IP range: 192.168.1.1-192.168.1.100</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={initiateScan} 
                  disabled={isScanning || (scanMode === 'subnet' && selectedSubnets.length === 0) || (scanMode === 'custom' && customIPRanges.filter(r => r.trim()).length === 0)}
                  className="w-full md:w-auto"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Network Scan
                    </>
                  )}
                </Button>
              </div>

              {currentSession && currentSession.status === 'running' && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Scanning in progress...</span>
                        <span>{currentSession.subnets_scanned.length} subnets</span>
                      </div>
                      <Progress value={33} className="w-full" />
                      <div className="text-xs text-muted-foreground">
                        Started: {new Date(currentSession.started_at).toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scan Results</CardTitle>
              <CardDescription>
                {currentSession ? (
                  `Session: ${currentSession.id} - ${scanResults.length} devices discovered`
                ) : (
                  'No scan session selected'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scanResults.length > 0 && (
                <>
                  <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by IP, hostname, or OS..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={subnetFilter} onValueChange={setSubnetFilter}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="Subnet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subnets</SelectItem>
                        {Array.from(new Set(scanResults.map(r => r.subnet))).map(subnet => (
                          <SelectItem key={subnet} value={subnet}>{subnet}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Hostname</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>OS</TableHead>
                          <TableHead>Device Type</TableHead>
                          <TableHead>Subnet</TableHead>
                          <TableHead>Open Ports</TableHead>
                          <TableHead>Response Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((result) => (
                          <TableRow key={result.id}>
                            <TableCell className="font-mono">{result.ip}</TableCell>
                            <TableCell>{result.hostname || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(result.status)}
                                <span className="capitalize">{result.status}</span>
                              </div>
                            </TableCell>
                            <TableCell>{result.os || 'Unknown'}</TableCell>
                            <TableCell>
                              {result.device_type && (
                                <Badge className={getDeviceTypeColor(result.device_type)}>
                                  {result.device_type}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{result.subnet}</TableCell>
                            <TableCell>
                              {result.ports_open && result.ports_open.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {result.ports_open.slice(0, 3).map(port => (
                                    <Badge key={port} variant="outline" className="text-xs">
                                      {port}
                                    </Badge>
                                  ))}
                                  {result.ports_open.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{result.ports_open.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {result.response_time ? `${result.response_time}ms` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {scanResults.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No scan results available</p>
                  <p className="text-sm">Initiate a network scan to discover devices</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scanResults.length}</div>
                <p className="text-xs text-muted-foreground">
                  Across {Array.from(new Set(scanResults.map(r => r.subnet))).length} subnets
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {scanResults.filter(r => r.status === 'online').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {scanResults.length > 0 ? 
                    Math.round((scanResults.filter(r => r.status === 'online').length / scanResults.length) * 100) 
                    : 0}% availability
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Scan</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentSession ? (
                    currentSession.status === 'completed' ? 'Complete' : 'Running'
                  ) : (
                    'None'
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentSession ? new Date(currentSession.started_at).toLocaleString() : 'No scans yet'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Devices by Subnet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(getSubnetStats()).map(([subnet, stats]) => (
                    <div key={subnet} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-mono">{subnet}</span>
                        <span>{stats.online}/{stats.total}</span>
                      </div>
                      <Progress value={(stats.online / stats.total) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operating Systems</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(getOSStats()).map(([os, count]) => (
                    <div key={os} className="flex justify-between">
                      <span className="text-sm">{os}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
