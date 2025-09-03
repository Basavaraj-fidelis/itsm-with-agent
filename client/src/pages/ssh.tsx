import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Terminal,
  Copy,
  Download,
  ArrowLeft,
  Info,
  Key,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

export default function SSHPage() {
  const [connectionInfo, setConnectionInfo] = useState({
    host: "",
    port: "",
    deviceName: "",
    username: "root",
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setConnectionInfo({
      host: urlParams.get("host") || "",
      port: urlParams.get("port") || "22",
      deviceName: urlParams.get("deviceName") || "Remote Device",
      username: urlParams.get("username") || "root",
    });
  }, []);

  const copySSHCommand = () => {
    const sshCommand = `ssh ${connectionInfo.username}@${connectionInfo.host} -p ${connectionInfo.port}`;
    navigator.clipboard.writeText(sshCommand);
  };

  const copyScpCommand = () => {
    const scpCommand = `scp -P ${connectionInfo.port} file.txt ${connectionInfo.username}@${connectionInfo.host}:~/`;
    navigator.clipboard.writeText(scpCommand);
  };

  const downloadPuttySession = () => {
    const puttyConfig = `[session]
hostname=${connectionInfo.host}
port=${connectionInfo.port}
protocol=ssh
username=${connectionInfo.username}
compression=1
ssh2des=0`;

    const blob = new Blob([puttyConfig], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${connectionInfo.deviceName}-ssh.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openWebSSH = () => {
    // Open a web-based SSH client
    const sshUrl = `/web-ssh?host=${connectionInfo.host}&port=${connectionInfo.port}&username=${connectionInfo.username}`;
    window.open(sshUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-green-500" />
            <span>Secure Shell (SSH) Connection</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Connect to <strong>{connectionInfo.deviceName}</strong> via command line
          </p>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="connect" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="connect">Connect</TabsTrigger>
              <TabsTrigger value="commands">Commands</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>

            <TabsContent value="connect" className="space-y-6">
              {/* Connection Details */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="host">Host Address</Label>
                  <Input
                    id="host"
                    value={connectionInfo.host}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    value={connectionInfo.port}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={connectionInfo.username}
                    onChange={(e) => setConnectionInfo({...connectionInfo, username: e.target.value})}
                  />
                </div>
              </div>

              {/* Connection Methods */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Connection Methods</h3>

                {/* Command Line SSH */}
                <Card className="p-4 border-green-200 bg-green-50">
                  <div className="flex items-start space-x-3">
                    <Terminal className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900">Command Line SSH</h4>
                      <p className="text-sm text-green-700 mb-3">
                        Use your terminal or command prompt to connect
                      </p>
                      <div className="bg-black text-green-400 p-3 rounded font-mono text-sm mb-3">
                        ssh {connectionInfo.username}@{connectionInfo.host} -p {connectionInfo.port}
                      </div>
                      <Button onClick={copySSHCommand} className="bg-green-600 hover:bg-green-700">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy SSH Command
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Web SSH */}
                <Card className="p-4 border-blue-200 bg-blue-50">
                  <div className="flex items-start space-x-3">
                    <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">Web SSH Terminal</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Connect through a web-based SSH terminal
                      </p>
                      <Button onClick={openWebSSH} className="bg-blue-600 hover:bg-blue-700">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Web Terminal
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* PuTTY (Windows) */}
                <Card className="p-4 border-gray-200">
                  <div className="flex items-start space-x-3">
                    <Download className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">PuTTY Configuration</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Download configuration for PuTTY SSH client
                      </p>
                      <Button onClick={downloadPuttySession} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download PuTTY Config
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="commands" className="space-y-4">
              <h3 className="font-medium text-lg">Common SSH Commands</h3>

              <div className="space-y-4">
                <Card className="p-4">
                  <h4 className="font-medium mb-2">File Transfer (SCP)</h4>
                  <div className="bg-black text-green-400 p-3 rounded font-mono text-sm mb-2">
                    scp -P {connectionInfo.port} file.txt {connectionInfo.username}@{connectionInfo.host}:~/
                  </div>
                  <Button onClick={copyScpCommand} variant="outline" size="sm">
                    <Copy className="w-3 h-3 mr-2" />
                    Copy SCP Command
                  </Button>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium mb-2">Port Forwarding</h4>
                  <div className="bg-black text-green-400 p-3 rounded font-mono text-sm">
                    ssh -L 8080:localhost:80 {connectionInfo.username}@{connectionInfo.host} -p {connectionInfo.port}
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium mb-2">SSH with Key Authentication</h4>
                  <div className="bg-black text-green-400 p-3 rounded font-mono text-sm">
                    ssh -i ~/.ssh/id_rsa {connectionInfo.username}@{connectionInfo.host} -p {connectionInfo.port}
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tools" className="space-y-4">
              <h3 className="font-medium text-lg">SSH Client Tools</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    OpenSSH (Built-in)
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Available on Linux, macOS, and Windows 10+
                  </p>
                  <div className="text-xs text-gray-500">
                    Use the command line method above
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    PuTTY
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Popular SSH client for Windows
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://putty.org/" target="_blank" rel="noopener noreferrer">
                      Download PuTTY
                    </a>
                  </Button>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    SSH Key Generation
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Generate SSH key pairs for secure authentication
                  </p>
                  <div className="bg-black text-green-400 p-2 rounded font-mono text-xs">
                    ssh-keygen -t rsa -b 4096
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    MobaXterm
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Enhanced terminal with X11, tabs, and file transfer
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://mobaxterm.mobatek.net/" target="_blank" rel="noopener noreferrer">
                      Download MobaXterm
                    </a>
                  </Button>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Security Notice */}
          <div className="mt-6 bg-yellow-50 p-4 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-2">Security Notes</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                  <li>Always verify the host key fingerprint on first connection</li>
                  <li>Use SSH key authentication instead of passwords when possible</li>
                  <li>Ensure SSH service is properly configured on the target machine</li>
                  <li>Check firewall settings allow port {connectionInfo.port}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <Button onClick={() => window.history.back()} variant="outline" className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}