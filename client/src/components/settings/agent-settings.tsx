
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Server, 
  Monitor, 
  Settings as SettingsIcon, 
  Info,
  Laptop 
} from "lucide-react";

interface AgentSettingsProps {
  settings: any;
  onSettingUpdate: (key: string, value: any) => void;
}

export function AgentSettings({ settings, onSettingUpdate }: AgentSettingsProps) {
  const { toast } = useToast();

  const agentOptions = [
    {
      platform: "windows",
      name: "Windows Agent",
      description: "For Windows 10/11 and Server",
      icon: Monitor,
      filename: "itsm-agent-windows.zip",
    },
    {
      platform: "linux",
      name: "Linux Agent",
      description: "For Ubuntu, CentOS, RHEL",
      icon: Server,
      filename: "itsm-agent-linux.zip",
    },
    {
      platform: "macos",
      name: "macOS Agent",
      description: "For macOS 10.15+",
      icon: Laptop,
      filename: "itsm-agent-macos.zip",
    },
  ];

  const downloadAgent = async (platform: string) => {
    try {
      const response = await fetch(`/api/download/agent/${platform}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Download error response:", errorText);
        throw new Error(`Download failed: ${response.status} ${errorText}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `itsm-agent-${platform}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `ITSM Agent for ${platform} is downloading...`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download the agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Agent Download Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Agent Download
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download the ITSM agent for your target systems. The agent
              collects system information and enables remote management
              capabilities.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              {agentOptions.map((agent) => (
                <Card
                  key={agent.platform}
                  className="cursor-pointer hover:bg-accent transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <agent.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {agent.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-3"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAgent(agent.platform)}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                    Installation Notes
                  </h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                    <li>
                      • Configure config.ini with your server details before
                      deployment
                    </li>
                    <li>• Ensure Python 3.7+ is installed on target systems</li>
                    <li>
                      • Administrator/root privileges required for installation
                    </li>
                    <li>• Check firewall settings for outbound connectivity</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Agent Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-assignment</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically assign tickets to available agents
                </p>
              </div>
              <Switch
                checked={settings.autoAssignment}
                onCheckedChange={(checked) =>
                  onSettingUpdate("autoAssignment", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Agent Health Monitoring</Label>
                <p className="text-sm text-muted-foreground">
                  Monitor agent system performance and connectivity
                </p>
              </div>
              <Switch
                checked={settings.agentMonitoring}
                onCheckedChange={(checked) =>
                  onSettingUpdate("agentMonitoring", checked)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-port">Default Agent Port</Label>
              <Input
                id="agent-port"
                type="number"
                min="1024"
                max="65535"
                value={settings.agentPort}
                onChange={(e) =>
                  onSettingUpdate("agentPort", parseInt(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heartbeat-interval">
                Heartbeat Interval (seconds)
              </Label>
              <Input
                id="heartbeat-interval"
                type="number"
                min="10"
                max="300"
                value={settings.heartbeatInterval}
                onChange={(e) =>
                  onSettingUpdate("heartbeatInterval", parseInt(e.target.value))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
