
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Monitor,
  ArrowLeft,
  Download,
  Copy,
  ExternalLink,
  Info,
  Settings,
} from "lucide-react";

export default function RDPPage() {
  const [connectionInfo, setConnectionInfo] = useState({
    host: "",
    port: "",
    deviceName: "",
    username: "",
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setConnectionInfo({
      host: urlParams.get("host") || "",
      port: urlParams.get("port") || "3389",
      deviceName: urlParams.get("deviceName") || "Remote Device",
      username: urlParams.get("username") || "",
    });
  }, []);

  const downloadRDPFile = () => {
    const rdpContent = `full address:s:${connectionInfo.host}:${connectionInfo.port}
username:s:${connectionInfo.username}
screen mode id:i:2
use multimon:i:0
desktopwidth:i:1920
desktopheight:i:1080
session bpp:i:32
winposstr:s:0,3,0,0,800,600
compression:i:1
keyboardhook:i:2
audiocapturemode:i:0
videoplaybackmode:i:1
connection type:i:7
networkautodetect:i:1
bandwidthautodetect:i:1
displayconnectionbar:i:1
enableworkspacereconnect:i:0
disable wallpaper:i:0
allow font smoothing:i:0
allow desktop composition:i:0
disable full window drag:i:1
disable menu anims:i:1
disable themes:i:0
disable cursor setting:i:0
bitmapcachepersistenable:i:1
audiomode:i:0
redirectprinters:i:1
redirectcomports:i:0
redirectsmartcards:i:1
redirectclipboard:i:1
redirectposdevices:i:0
autoreconnection enabled:i:1
authentication level:i:2
prompt for credentials:i:0
negotiate security layer:i:1
remoteapplicationmode:i:0
alternate shell:s:
shell working directory:s:
gatewayhostname:s:
gatewayusagemethod:i:4
gatewaycredentialssource:i:4
gatewayprofileusagemethod:i:0
promptcredentialonce:i:0
gatewaybrokeringtype:i:0
use redirection server name:i:0
rdgiskdcproxy:i:0
kdcproxyname:s:`;

    const blob = new Blob([rdpContent], { type: "application/rdp" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${connectionInfo.deviceName}.rdp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyConnectionString = () => {
    const connectionString = `${connectionInfo.host}:${connectionInfo.port}`;
    navigator.clipboard.writeText(connectionString);
  };

  const openWindowsRDP = () => {
    // Try to launch mstsc (Windows RDP client) with connection details
    const rdpUri = `rdp://full%20address=s:${connectionInfo.host}:${connectionInfo.port}&username=s:${connectionInfo.username}`;
    window.open(rdpUri, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="w-5 h-5 text-blue-500" />
            <span>Remote Desktop Protocol (RDP)</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Connect to <strong>{connectionInfo.deviceName}</strong> using Windows Remote Desktop
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Connection Details */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Connection Methods */}
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Connection Methods</h3>
            
            {/* Method 1: Download RDP File */}
            <Card className="p-4 border-blue-200 bg-blue-50">
              <div className="flex items-start space-x-3">
                <Download className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900">Download RDP File (Recommended)</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Download a .rdp file that will open directly in Remote Desktop Connection
                  </p>
                  <Button onClick={downloadRDPFile} className="bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Download RDP File
                  </Button>
                </div>
              </div>
            </Card>

            {/* Method 2: Manual Connection */}
            <Card className="p-4 border-gray-200">
              <div className="flex items-start space-x-3">
                <Settings className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Manual Connection</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Open Remote Desktop Connection and enter the connection details manually
                  </p>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={copyConnectionString}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Address
                    </Button>
                    <Button variant="outline" onClick={openWindowsRDP}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open RDP Client
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Method 3: Web RDP */}
            <Card className="p-4 border-green-200 bg-green-50">
              <div className="flex items-start space-x-3">
                <Monitor className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900">Web-based RDP</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Connect through a web-based RDP client (requires RD Gateway)
                  </p>
                  <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Launch Web RDP
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="flex items-start space-x-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Connection Instructions</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                  <li>Ensure Remote Desktop is enabled on the target machine</li>
                  <li>Verify the user account has Remote Desktop permissions</li>
                  <li>Check that port {connectionInfo.port} is open in the firewall</li>
                  <li>Use domain credentials if connecting to a domain-joined machine</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <details className="border border-gray-200 rounded-md">
            <summary className="p-3 cursor-pointer font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>Troubleshooting</span>
            </summary>
            <div className="p-3 border-t space-y-2 text-sm text-gray-600">
              <p><strong>Connection refused:</strong> Check if Remote Desktop service is running</p>
              <p><strong>Authentication failed:</strong> Verify username and password</p>
              <p><strong>Network error:</strong> Ensure port {connectionInfo.port} is accessible</p>
              <p><strong>Slow performance:</strong> Reduce color depth or disable visual effects</p>
            </div>
          </details>

          {/* Action Buttons */}
          <div className="flex gap-2">
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
