
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Play, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface Command {
  id: string;
  device_id: string;
  device_hostname: string;
  type: string;
  command: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'deferred';
  priority: number;
  created_at: string;
  updated_at: string;
  output?: string;
  error?: string;
}

export default function CommandCenter() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [commandType, setCommandType] = useState("execute");
  const [commandText, setCommandText] = useState("");
  const [priority, setPriority] = useState("5");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCommands();
    fetchDevices();
    const interval = setInterval(fetchCommands, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchCommands = async () => {
    try {
      const response = await fetch('/api/commands/history', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCommands(data);
      }
    } catch (error) {
      console.error('Failed to fetch commands:', error);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDevices(data.filter(d => d.status === 'online'));
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  };

  const submitCommand = async () => {
    if (!selectedDevice || !commandText.trim()) {
      toast({ title: "Error", description: "Please select device and enter command" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/commands/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          device_id: selectedDevice,
          type: commandType,
          command: commandText,
          priority: parseInt(priority)
        })
      });

      if (response.ok) {
        toast({ title: "Success", description: "Command queued successfully" });
        setCommandText("");
        fetchCommands();
      } else {
        throw new Error('Failed to queue command');
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to queue command" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'executing': return <Play className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'deferred': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Command Center</h1>
      
      {/* Command Submission Form */}
      <Card>
        <CardHeader>
          <CardTitle>Execute Remote Command</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger>
                <SelectValue placeholder="Select Device" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device: any) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.hostname} ({device.ip_address})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={commandType} onValueChange={setCommandType}>
              <SelectTrigger>
                <SelectValue placeholder="Command Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="execute">Execute Script</SelectItem>
                <SelectItem value="upload">Upload File</SelectItem>
                <SelectItem value="download">Download File</SelectItem>
                <SelectItem value="patch">Apply Patch</SelectItem>
                <SelectItem value="restart">Restart Service</SelectItem>
                <SelectItem value="health_check">Health Check</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Critical (1)</SelectItem>
                <SelectItem value="2">High (2)</SelectItem>
                <SelectItem value="5">Normal (5)</SelectItem>
                <SelectItem value="8">Low (8)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Textarea
            placeholder="Enter command or script..."
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            rows={4}
          />

          <Button onClick={submitCommand} disabled={isSubmitting}>
            {isSubmitting ? "Queuing..." : "Queue Command"}
          </Button>
        </CardContent>
      </Card>

      {/* Command History */}
      <Card>
        <CardHeader>
          <CardTitle>Command History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commands.map((command) => (
              <div key={command.id} className="border rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(command.status)}
                    <span className="font-medium">{command.device_hostname}</span>
                    <Badge variant="outline">{command.type}</Badge>
                    <Badge variant="secondary">Priority {command.priority}</Badge>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(command.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="bg-gray-100 p-2 rounded text-sm font-mono">
                  {command.command}
                </div>
                {command.output && (
                  <div className="mt-2 bg-green-50 p-2 rounded text-sm">
                    <strong>Output:</strong> {command.output}
                  </div>
                )}
                {command.error && (
                  <div className="mt-2 bg-red-50 p-2 rounded text-sm">
                    <strong>Error:</strong> {command.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
