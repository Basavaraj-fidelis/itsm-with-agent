
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Cog, 
  Download, 
  Play, 
  Package, 
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  Zap
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function AutomationCenter() {
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const queryClient = useQueryClient();

  const { data: devices } = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.get("/api/devices").then(res => res.data)
  });

  const { data: packages, isError: packagesError } = useQuery({
    queryKey: ["software-packages"],
    queryFn: () => api.get("/api/automation/software-packages").then(res => res.data),
    retry: 1,
    onError: (error) => {
      console.error("Error fetching software packages:", error);
    }
  });

  const { data: deployments, isError: deploymentsError } = useQuery({
    queryKey: ["deployments"],
    queryFn: () => api.get("/api/automation/deployments").then(res => res.data),
    retry: 1,
    onError: (error) => {
      console.error("Error fetching deployments:", error);
    }
  });

  const deployMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/automation/deploy-software", data),
    onSuccess: () => {
      toast({
        title: "Deployment Scheduled",
        description: "Software deployment has been scheduled successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
      setSelectedDevices([]);
      setSelectedPackage("");
      setScheduledTime("");
    },
    onError: (error: any) => {
      toast({
        title: "Deployment Failed",
        description: error.response?.data?.message || "Failed to schedule deployment",
        variant: "destructive"
      });
    }
  });

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleDeploy = () => {
    if (!selectedPackage || selectedDevices.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a package and at least one device.",
        variant: "destructive"
      });
      return;
    }

    deployMutation.mutate({
      device_ids: selectedDevices,
      package_id: selectedPackage,
      scheduled_time: scheduledTime || undefined
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation Center</h1>
          <p className="text-muted-foreground">Deploy software, manage configurations, and automate IT tasks</p>
        </div>
        <Button variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Automation Settings
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deployments</CardTitle>
            <Loader2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deployments?.filter((d: any) => d.metadata?.status === "in_progress").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Packages</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packages?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Ready for deployment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Tasks</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deployments?.filter((d: any) => d.metadata?.status === "scheduled").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Waiting to execute</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">94%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Software Deployment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Software Deployment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {packagesError && (
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <XCircle className="w-4 h-4" />
              <span>Error loading software packages. Please try again.</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="package-select">Software Package</Label>
              <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select software to deploy" />
                </SelectTrigger>
                <SelectContent>
                  {packages?.map((pkg: any) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} v{pkg.version} ({pkg.size_mb}MB)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="schedule-time">Schedule Time (Optional)</Label>
              <Input
                id="schedule-time"
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Target Devices ({selectedDevices.length} selected)</Label>
            <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {devices?.map((device: any) => (
                <div key={device.id} className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id={device.id}
                    checked={selectedDevices.includes(device.id)}
                    onCheckedChange={() => handleDeviceToggle(device.id)}
                  />
                  <label htmlFor={device.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {device.hostname} ({device.ip_address}) - {device.os_name}
                  </label>
                  <Badge variant={device.status === "online" ? "default" : "secondary"}>
                    {device.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleDeploy} 
            disabled={deployMutation.isPending || !selectedPackage || selectedDevices.length === 0}
            className="w-full"
          >
            {deployMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Deploy Software
          </Button>
        </CardContent>
      </Card>

      {/* Deployment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="w-5 h-5" />
            Recent Deployments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deployments && deployments.length > 0 ? (
            <div className="space-y-3">
              {deployments.slice(0, 10).map((deployment: any) => (
                <div key={deployment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {deployment.metadata?.status === "completed" ? 
                      <CheckCircle className="w-5 h-5 text-green-500" /> :
                      deployment.metadata?.status === "failed" ?
                      <XCircle className="w-5 h-5 text-red-500" /> :
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    }
                    <div>
                      <p className="font-medium">{deployment.message}</p>
                      <p className="text-sm text-muted-foreground">
                        {deployment.metadata?.package_info?.name} - 
                        Progress: {deployment.metadata?.progress_percentage || 0}%
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    deployment.metadata?.status === "completed" ? "default" :
                    deployment.metadata?.status === "failed" ? "destructive" : "secondary"
                  }>
                    {deployment.metadata?.status || deployment.severity}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-4" />
              <p>No deployments yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
