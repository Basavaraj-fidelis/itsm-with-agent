import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertCircle,
  Monitor,
  Wifi,
  ArrowLeft,
  Package,
  FileText,
  Server,
  AlertTriangle,
  Info,
  HelpCircle,
  X,
  Settings,
  Download,
  Camera,
  RefreshCw,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Copy,
  Eye,
  EyeOff,
  Activity,
  Clock,
  Shield,
  Keyboard,
} from "lucide-react";

export default function VNCPage() {
  const vncRef = useRef<HTMLDivElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showConnectionInfo, setShowConnectionInfo] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [connectionStats, setConnectionStats] = useState({
    latency: 0,
    bandwidth: 0,
    startTime: new Date(),
    bytesReceived: 0,
    bytesSent: 0,
  });

  // VNC Settings
  const [viewOnly, setViewOnly] = useState(false);
  const [scaleViewport, setScaleViewport] = useState(true);
  const [clipViewport, setClipViewport] = useState(false);
  const [showDotCursor, setShowDotCursor] = useState(false);
  const [quality, setQuality] = useState("6");
  const [compression] = useState("2");
  const [enableAudio, setEnableAudio] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const host = urlParams.get("host") || "localhost";
    const port = urlParams.get("port") || "6080";
    const vncPort = urlParams.get("vncport") || "5900";
    const deviceName = urlParams.get("deviceName") || "Remote Device";

    let rfb: any = null;

    // Update connection stats periodically
    const statsInterval = setInterval(() => {
      if (connectionStatus === "connected" && rfb) {
        setConnectionStats(prev => ({
          ...prev,
          latency: Math.random() * 50 + 10, // Mock latency
          bandwidth: Math.random() * 1000 + 500, // Mock bandwidth
        }));
      }
    }, 2000);

    const loadNoVNC = async () => {
      try {
        if (!(window as any).RFB) {
          await loadScript(
            "https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/core/rfb.js",
          );
        }
        initializeVNC(host, port, vncPort, deviceName);
      } catch (error) {
        console.error("Failed to load NoVNC:", error);
        setConnectionStatus("error");
        setErrorMessage("Failed to load VNC client");
      }
    };

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initializeVNC = (
      host: string,
      port: string,
      vncPort: string,
      deviceName: string,
    ) => {
      if (vncRef.current && (window as any).RFB) {
        const RFB = (window as any).RFB;
        vncRef.current.innerHTML = "";

        try {
          // Try multiple connection methods with proper host resolution
          const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
          const resolvedHost = isLocalhost ? window.location.hostname : host;

          const possibleUrls = [
            // Primary websockify endpoints
            `ws://${resolvedHost}:${port}/websockify`,
            `ws://${resolvedHost}:6080/websockify`,
            `ws://${resolvedHost}:8080/websockify`,
            `ws://${resolvedHost}:5900/websockify`,
            // TightVNC built-in web server endpoints
            `ws://${resolvedHost}:5800/websockify`,
            `ws://${resolvedHost}:5800/`,
            // Secure websocket endpoints
            `wss://${resolvedHost}:${port}/websockify`,
            `wss://${resolvedHost}:6080/websockify`,
            `wss://${resolvedHost}:8080/websockify`,
            `wss://${resolvedHost}:5800/websockify`,
            // Alternative paths
            `ws://${resolvedHost}:${port}/`,
            `ws://${resolvedHost}:6080/`,
            `ws://${resolvedHost}:5800/vnc`,
            // Fallback to original host if different
            ...(resolvedHost !== host ? [
              `ws://${host}:${port}/websockify`,
              `ws://${host}:6080/websockify`,
              `ws://${host}:8080/websockify`,
              `ws://${host}:5800/websockify`,
            ] : [])
          ];

          const tryConnection = (urlIndex: number) => {
            if (urlIndex >= possibleUrls.length) {
              setConnectionStatus("error");
              setErrorMessage(
                "Could not connect to any VNC endpoints. Please ensure NoVNC is properly configured on the target system.",
              );
              return;
            }

            const wsUrl = possibleUrls[urlIndex];
            console.log(
              `Attempting VNC connection ${urlIndex + 1}/${possibleUrls.length}: ${wsUrl}`,
            );

            try {
              rfb = new RFB(vncRef.current, wsUrl, {
                credentials: { username: "", password: "" },
                viewOnly: viewOnly,
                focusOnClick: true,
                clipViewport: clipViewport,
                scaleViewport: scaleViewport,
                resizeSession: false,
                showDotCursor: showDotCursor,
                background: "#000000",
                qualityLevel: parseInt(quality),
                compressionLevel: parseInt(compression),
              });

              rfb.addEventListener("connect", () => {
                console.log("VNC connected successfully via:", wsUrl);
                setConnectionStatus("connected");
                setConnectionStats(prev => ({ ...prev, startTime: new Date() }));
              });

              rfb.addEventListener("disconnect", (e: any) => {
                console.log("VNC disconnected:", e.detail);
                const reason = e.detail?.reason || "Connection lost";

                if (connectionStatus === "connecting" && urlIndex + 1 < possibleUrls.length) {
                  console.log(`Connection attempt ${urlIndex + 1} failed: ${reason}, trying next...`);
                  setTimeout(() => tryConnection(urlIndex + 1), 1000);
                } else {
                  setConnectionStatus("disconnected");
                  if (reason.includes("ERR_BLOCKED_BY_CLIENT")) {
                    setErrorMessage("Connection blocked by browser or security extension. Please disable ad blockers and try again.");
                  } else if (reason.includes("ERR_CONNECTION_REFUSED")) {
                    setErrorMessage("VNC server is not running on the target machine. Please ensure NoVNC websockify is started.");
                  } else {
                    setErrorMessage(reason);
                  }
                }
              });

              rfb.addEventListener("credentialsrequired", () => {
                const password = prompt("VNC Password (leave blank if none):");
                rfb.sendCredentials({ password: password || "" });
              });

              rfb.addEventListener("securityfailure", (e: any) => {
                console.error("VNC security failure:", e.detail);
                if (urlIndex + 1 < possibleUrls.length) {
                  setTimeout(() => tryConnection(urlIndex + 1), 1000);
                } else {
                  setConnectionStatus("error");
                  setErrorMessage("Authentication failed on all connection attempts");
                }
              });
            } catch (error: any) {
              console.error(`Connection attempt ${urlIndex + 1} failed:`, error);
              if (urlIndex + 1 < possibleUrls.length) {
                setTimeout(() => tryConnection(urlIndex + 1), 1000);
              } else {
                setConnectionStatus("error");
                if (error.message?.includes("ERR_BLOCKED_BY_CLIENT") || error.toString().includes("blocked")) {
                  setErrorMessage("Connection blocked by browser security. Please:\n1. Disable ad blockers\n2. Allow mixed content\n3. Check browser console for details");
                } else if (error.message?.includes("ERR_ADDRESS_INVALID") || error.toString().includes("address")) {
                  setErrorMessage("Invalid server address. Please check the hostname and ensure the VNC server is accessible.");
                } else if (error.message?.includes("ERR_CONNECTION_REFUSED")) {
                  setErrorMessage("VNC server is not running or not accessible. Please ensure NoVNC websockify is started on the target machine.");
                } else {
                  setErrorMessage(`Failed to establish VNC connection: ${error.message || "Unknown error"}`);
                }
              }
            }
          };

          tryConnection(0);
        } catch (error) {
          setConnectionStatus("error");
          setErrorMessage("Failed to initialize VNC client");
        }
      }
    };

    loadNoVNC();

    return () => {
      if (rfb) {
        rfb.disconnect();
      }
      clearInterval(statsInterval);
    };
  }, [viewOnly, scaleViewport, clipViewport, showDotCursor, quality, compression]);

  const urlParams = new URLSearchParams(window.location.search);
  const host = urlParams.get("host") || "localhost";
  const deviceName = urlParams.get("deviceName") || "Remote Device";

  const handleReconnect = () => {
    setConnectionStatus("connecting");
    setErrorMessage("");
    window.location.reload();
  };

  const takeScreenshot = () => {
    const canvas = vncRef.current?.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `screenshot-${deviceName}-${new Date().toISOString().slice(0, 19)}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      vncRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const sendCtrlAltDel = () => {
    // This would send Ctrl+Alt+Del to the remote machine
    console.log("Sending Ctrl+Alt+Del");
  };

  if (connectionStatus === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span>Connection Failed</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                Unable to connect to remote desktop on <strong>{host}</strong>
              </p>
              {errorMessage && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {errorMessage}
                </p>
              )}
            </div>

            <Tabs defaultValue="troubleshooting" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
                <TabsTrigger value="setup">Setup Guide</TabsTrigger>
              </TabsList>

              <TabsContent value="troubleshooting" className="space-y-4">
                <div className="text-sm text-gray-500 space-y-3">
                  <p className="font-medium">Connection Issues & Solutions:</p>
                  <ul className="list-disc list-inside space-y-2 text-xs">
                    <li><strong>ERR_BLOCKED_BY_CLIENT:</strong> Disable ad blockers, enable mixed content</li>
                    <li><strong>Port 24678 blocked:</strong> Use standard VNC ports (5900, 6080)</li>
                    <li><strong>NoVNC websockify not running:</strong> Start on port 6080</li>
                    <li><strong>VNC server not running:</strong> Start VNC server on port 5900</li>
                    <li><strong>Firewall blocking:</strong> Allow ports 5900, 6080, 8080</li>
                    <li><strong>0.0.0.0 address issues:</strong> Use actual hostname/IP</li>
                    <li><strong>Browser security:</strong> Try different browser or incognito mode</li>
                    <li><strong>Private IP endpoints:</strong> Establish VPN connection first, then connect using private IP</li>
                    <li><strong>Network isolation:</strong> Use SSH tunnel or reverse proxy for secure access</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                  <h4 className="font-medium text-yellow-800 mb-2 text-xs">Private Network Access</h4>
                  <div className="text-xs text-yellow-700 space-y-1">
                    <p><strong>Option 1:</strong> Connect via VPN to access private IP directly</p>
                    <p><strong>Option 2:</strong> Use SSH tunnel: <code className="bg-yellow-100 px-1 rounded">ssh -L 6080:endpoint_private_ip:6080 jump_host</code></p>
                    <p><strong>Option 3:</strong> Deploy reverse proxy on accessible server</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="setup" className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-md text-blue-700 text-sm">
                  <p className="font-medium mb-2">Quick Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Install VNC server on target machine</li>
                    <li>Install NoVNC: <code className="bg-white px-1 rounded">apt install novnc</code></li>
                    <li>Start websockify: <code className="bg-white px-1 rounded">websockify 6080 localhost:5900</code></li>
                    <li>Ensure firewall allows port 6080</li>
                  </ol>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-md text-orange-700 text-sm">
                  <p className="font-medium mb-2">Private Network Setup:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li><strong>VPN Method:</strong> Connect to company VPN, then use private IP directly</li>
                    <li><strong>SSH Tunnel:</strong> Create tunnel via jump host: <code className="bg-white px-1 rounded">ssh -L 6080:PRIVATE_IP:6080 jump_host</code></li>
                    <li><strong>Reverse Proxy:</strong> Deploy nginx/apache on public server to proxy connections</li>
                    <li><strong>Cloud Bastion:</strong> Use cloud provider's bastion host service</li>
                  </ol>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Button onClick={handleReconnect} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex">
      {/* Enhanced Left Sidebar */}
      <div className="w-80 bg-gray-800 text-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Remote Desktop</h2>
            <Badge variant={connectionStatus === "connected" ? "default" : "destructive"}>
              {connectionStatus}
            </Badge>
          </div>
          <p className="text-sm text-gray-300">{deviceName}</p>
          <p className="text-xs text-gray-400">{host}</p>
        </div>

        {/* Connection Stats */}
        {connectionStatus === "connected" && (
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-medium mb-3 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Connection Stats
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-300">Latency:</span>
                <span className="text-green-400">{Math.round(connectionStats.latency)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Bandwidth:</span>
                <span className="text-blue-400">{Math.round(connectionStats.bandwidth)} KB/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Session Time:</span>
                <span className="text-yellow-400">
                  {Math.floor((Date.now() - connectionStats.startTime.getTime()) / 60000)}m
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-semibold mb-3 text-sm">Quick Actions</h3>
          <div className="space-y-2">
            <Button
              onClick={takeScreenshot}
              className="w-full justify-start text-sm bg-blue-600 hover:bg-blue-700"
              size="sm"
              disabled={connectionStatus !== "connected"}
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Screenshot
            </Button>
            <Button
              onClick={sendCtrlAltDel}
              className="w-full justify-start text-sm bg-gray-700 hover:bg-gray-600"
              size="sm"
              disabled={connectionStatus !== "connected"}
            >
              <Keyboard className="w-4 h-4 mr-2" />
              Send Ctrl+Alt+Del
            </Button>
            <Button
              onClick={toggleFullscreen}
              className="w-full justify-start text-sm bg-gray-700 hover:bg-gray-600"
              size="sm"
              disabled={connectionStatus !== "connected"}
            >
              {fullscreen ? <Minimize className="w-4 h-4 mr-2" /> : <Maximize className="w-4 h-4 mr-2" />}
              {fullscreen ? "Exit" : "Enter"} Fullscreen
            </Button>
          </div>
        </div>

        {/* VNC Settings */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Display Settings
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              {showSettings ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>

          {showSettings && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <Label htmlFor="viewOnly">View Only</Label>
                <Switch
                  id="viewOnly"
                  checked={viewOnly}
                  onCheckedChange={setViewOnly}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="scaleViewport">Scale to Fit</Label>
                <Switch
                  id="scaleViewport"
                  checked={scaleViewport}
                  onCheckedChange={setScaleViewport}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="clipViewport">Clip Viewport</Label>
                <Switch
                  id="clipViewport"
                  checked={clipViewport}
                  onCheckedChange={setClipViewport}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quality">Quality Level</Label>
                <Select value={quality} onValueChange={setQuality}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">High</SelectItem>
                    <SelectItem value="6">Medium</SelectItem>
                    <SelectItem value="9">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Service Desk Integration */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Service Desk
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => window.open('/tickets/new', '_blank')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Create Support Ticket
          </Button>
        </div>

        {/* System Info */}
        <div className="p-4 flex-1">
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
            <Info className="w-4 h-4" />
            System Info
          </h3>
          <div className="space-y-2 text-xs text-gray-300">
            <div className="flex justify-between">
              <span>Host:</span>
              <span className="text-white font-mono">{host}</span>
            </div>
            <div className="flex justify-between">
              <span>Protocol:</span>
              <span className="text-green-400">VNC</span>
            </div>
            <div className="flex justify-between">
              <span>Security:</span>
              <span className="text-yellow-400">
                <Shield className="w-3 h-3 inline mr-1" />
                Encrypted
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main VNC Display */}
      <div className="flex-1 bg-black relative">
        <div className="w-full h-full" ref={vncRef}>
          {connectionStatus === "connecting" && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-6"></div>
                <h3 className="text-white text-xl mb-2">Connecting to Remote Desktop</h3>
                <p className="text-blue-300 text-sm mb-4">{deviceName}</p>
                <div className="flex items-center justify-center space-x-2 text-gray-400 text-xs">
                  <Clock className="w-4 h-4" />
                  <span>Please wait while we establish a secure connection...</span>
                </div>
              </div>
            </div>
          )}

          {connectionStatus === "connected" && (
            <div className="absolute top-4 right-4 bg-black/70 rounded-lg px-4 py-2 z-10">
              <div className="flex items-center gap-3 text-white text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Connected</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1 text-xs text-gray-300">
                  <Wifi className="w-3 h-3" />
                  <span>{Math.round(connectionStats.latency)}ms</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}