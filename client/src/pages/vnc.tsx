import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

export default function VNCPage() {
  const vncRef = useRef<HTMLDivElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showConnectionInfo, setShowConnectionInfo] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const host = urlParams.get("host") || "localhost";
    const port = urlParams.get("port") || "6080"; // NoVNC web port, not VNC port
    const vncPort = urlParams.get("vncport") || "5900";
    const deviceName = urlParams.get("deviceName") || "Remote Device";

    let rfb: any = null;

    // Load NoVNC
    const loadNoVNC = async () => {
      try {
        // Load NoVNC from CDN
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

        // Clear any existing content
        vncRef.current.innerHTML = "";

        try {
          // Try different WebSocket URLs for NoVNC connection
          const possibleUrls = [
            `ws://${host}:${port}/websockify`,
            `ws://${host}:6080/websockify`,
            `ws://${host}:8080/websockify`,
            `wss://${host}:${port}/websockify`,
            `wss://${host}:6080/websockify`,
            `wss://${host}:8080/websockify`,
          ];

          let attemptCount = 0;

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
              // Create RFB connection with better scaling options
              rfb = new RFB(vncRef.current, wsUrl, {
                credentials: {
                  username: "",
                  password: "",
                },
                viewOnly: false,
                focusOnClick: true,
                clipViewport: false,
                scaleViewport: true,
                resizeSession: false,
                showDotCursor: false,
                background: "#000000",
              });

              // Handle connection events
              rfb.addEventListener("connect", () => {
                console.log("VNC connected successfully via:", wsUrl);
                setConnectionStatus("connected");
              });

              rfb.addEventListener("disconnect", (e: any) => {
                console.log("VNC disconnected:", e.detail);
                if (
                  connectionStatus === "connecting" &&
                  urlIndex + 1 < possibleUrls.length
                ) {
                  console.log("Trying next connection method...");
                  setTimeout(() => tryConnection(urlIndex + 1), 1000);
                } else {
                  setConnectionStatus("disconnected");
                  setErrorMessage(e.detail.reason || "Connection lost");
                }
              });

              rfb.addEventListener("credentialsrequired", () => {
                const password = prompt("VNC Password (leave blank if none):");
                rfb.sendCredentials({ password: password || "" });
              });

              rfb.addEventListener("securityfailure", (e: any) => {
                console.error("VNC security failure:", e.detail);
                if (urlIndex + 1 < possibleUrls.length) {
                  console.log(
                    "Authentication failed, trying next connection method...",
                  );
                  setTimeout(() => tryConnection(urlIndex + 1), 1000);
                } else {
                  setConnectionStatus("error");
                  setErrorMessage(
                    "Authentication failed on all connection attempts",
                  );
                }
              });
            } catch (error) {
              console.error(
                `Failed to create VNC connection with ${wsUrl}:`,
                error,
              );
              if (urlIndex + 1 < possibleUrls.length) {
                setTimeout(() => tryConnection(urlIndex + 1), 1000);
              } else {
                setConnectionStatus("error");
                setErrorMessage(
                  "Failed to establish VNC connection with any method",
                );
              }
            }
          };

          // Start connection attempts
          tryConnection(0);
        } catch (error) {
          console.error("Failed to initialize VNC:", error);
          setConnectionStatus("error");
          setErrorMessage("Failed to initialize VNC client");
        }
      }
    };

    loadNoVNC();

    // Cleanup function
    return () => {
      if (rfb) {
        rfb.disconnect();
      }
    };
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const host = urlParams.get("host") || "localhost";
  const deviceName = urlParams.get("deviceName") || "Remote Device";

  const handleReconnect = () => {
    setConnectionStatus("connecting");
    setErrorMessage("");
    window.location.reload();
  };

  if (connectionStatus === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span>Connection Failed</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Unable to connect to remote desktop on {host}
            </p>
            {errorMessage && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {errorMessage}
              </p>
            )}
            <div className="space-y-2 text-xs text-gray-500">
              <p>Possible issues:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  NoVNC websockify not running on target machine (typically port
                  6080)
                </li>
                <li>VNC server not running (typically port 5900)</li>
                <li>Firewall blocking websocket connection</li>
                <li>Incorrect host or port settings</li>
                <li>SSL/TLS certificate issues (try HTTP instead of HTTPS)</li>
              </ul>
              <div className="mt-3 p-2 bg-blue-50 rounded text-blue-700">
                <p className="font-medium">Setup Instructions:</p>
                <p>1. Install NoVNC on target machine</p>
                <p>
                  2. Start websockify:{" "}
                  <code className="bg-white px-1 rounded">
                    websockify 6080 localhost:5900
                  </code>
                </p>
                <p>3. Ensure VNC server is running on port 5900</p>
              </div>
            </div>
            <Button onClick={handleReconnect} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex">
      {/* Left Sidebar - Compact */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-semibold mb-3 text-sm">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full text-left p-2 bg-blue-600 rounded text-sm hover:bg-blue-700 transition-colors">
              💻 Take Screenshot
            </button>
            <button className="w-full text-left p-2 bg-gray-700 rounded text-sm hover:bg-gray-600 transition-colors">
              🔄 Restart Remote Machine
            </button>
            <button className="w-full text-left p-2 bg-gray-700 rounded text-sm hover:bg-gray-600 transition-colors">
              📁 File Transfer
            </button>
          </div>
        </div>

        {/* Service Desk */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Service Desk
          </h3>
          <div className="space-y-2">
            <button className="w-full text-left p-2 bg-gray-700 rounded text-xs hover:bg-gray-600 transition-colors">
              📋 Monitor tickets and requests
            </button>
          </div>
        </div>

        {/* Help Articles */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-semibold mb-3 text-sm">Help Articles</h3>
          <div className="space-y-1">
            <button className="w-full text-left p-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors">
              📖 Documentation and guides
            </button>
          </div>
        </div>

        {/* System Alerts */}
        <div className="p-4 flex-1">
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            System Alerts
          </h3>
          <div className="space-y-1">
            <button className="w-full text-left p-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors">
              🔔 Active system notifications
            </button>
          </div>
        </div>

        
      </div>

      <div className="flex-1 bg-black relative">
        {/* VNC Viewer Container - Optimized for minimal UI */}
        <div className="w-full h-full" ref={vncRef}>
          {connectionStatus === "connecting" && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-white text-lg">Connecting to TightVNC...</p>
                <p className="text-blue-300 mt-2 text-sm">{deviceName}</p>
              </div>
            </div>
          )}

          {connectionStatus === "connected" && (
            <>
              {/* Connection Status - Auto-hide after 5 seconds */}
              <div className="absolute top-2 right-2 bg-black/70 rounded px-3 py-1 z-10">
                <div className="flex items-center gap-2 text-white text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>TightVNC Connected</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
