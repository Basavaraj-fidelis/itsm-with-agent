
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Monitor, Wifi } from "lucide-react";

export default function VNCPage() {
  const vncRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const host = urlParams.get('host') || 'localhost';
    const port = urlParams.get('port') || '6080'; // NoVNC web port, not VNC port
    const vncPort = urlParams.get('vncport') || '5900';
    
    let rfb: any = null;
    
    // Load NoVNC
    const loadNoVNC = async () => {
      try {
        // Load NoVNC from CDN
        if (!(window as any).RFB) {
          await loadScript('https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/core/rfb.js');
        }
        
        initializeVNC();
      } catch (error) {
        console.error('Failed to load NoVNC:', error);
        setConnectionStatus('error');
        setErrorMessage('Failed to load VNC client');
      }
    };

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initializeVNC = () => {
      if (vncRef.current && (window as any).RFB) {
        const RFB = (window as any).RFB;
        
        // Clear any existing content
        vncRef.current.innerHTML = '';
        
        try {
          // WebSocket URL for VNC connection (typically through NoVNC websockify)
          const wsUrl = `ws://${host}:${port}/websockify`;
          
          console.log('Connecting to VNC via:', wsUrl);
          
          // Create RFB connection
          rfb = new RFB(vncRef.current, wsUrl, {
            credentials: {
              username: '',
              password: ''
            }
          });
          
          // Handle connection events
          rfb.addEventListener('connect', () => {
            console.log('VNC connected successfully');
            setConnectionStatus('connected');
          });
          
          rfb.addEventListener('disconnect', (e: any) => {
            console.log('VNC disconnected:', e.detail);
            setConnectionStatus('disconnected');
            setErrorMessage(e.detail.reason || 'Connection lost');
          });
          
          rfb.addEventListener('credentialsrequired', () => {
            const password = prompt('VNC Password (leave blank if none):');
            rfb.sendCredentials({ password: password || '' });
          });
          
          rfb.addEventListener('securityfailure', (e: any) => {
            console.error('VNC security failure:', e.detail);
            setConnectionStatus('error');
            setErrorMessage('Authentication failed');
          });
          
        } catch (error) {
          console.error('Failed to create VNC connection:', error);
          setConnectionStatus('error');
          setErrorMessage('Failed to establish VNC connection');
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
  const host = urlParams.get('host') || 'localhost';

  const handleReconnect = () => {
    setConnectionStatus('connecting');
    setErrorMessage('');
    window.location.reload();
  };

  if (connectionStatus === 'error') {
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
                <li>NoVNC server not running on target machine</li>
                <li>Firewall blocking connection</li>
                <li>Incorrect host or port settings</li>
                <li>VNC service not configured</li>
              </ul>
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
    <div className="min-h-screen bg-black">
      <div className="p-4 bg-gray-800 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center space-x-2">
              <Monitor className="w-5 h-5" />
              <span>Remote Desktop - {host}</span>
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <Wifi className={`w-4 h-4 ${connectionStatus === 'connected' ? 'text-green-400' : 'text-yellow-400'}`} />
              <span className="text-sm text-gray-300">
                Status: {connectionStatus === 'connecting' ? 'Connecting...' : 
                        connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          {connectionStatus === 'disconnected' && (
            <Button onClick={handleReconnect} size="sm" variant="outline">
              Reconnect
            </Button>
          )}
        </div>
      </div>
      
      {connectionStatus === 'connecting' && (
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center text-white">
            <Monitor className="w-12 h-12 mx-auto mb-4 animate-pulse" />
            <p>Establishing remote connection...</p>
            <p className="text-sm text-gray-400 mt-2">
              Connecting to {host}
            </p>
          </div>
        </div>
      )}
      
      <div 
        ref={vncRef} 
        className={`w-full h-[calc(100vh-80px)] ${connectionStatus === 'connecting' ? 'hidden' : ''}`}
        style={{ minHeight: '600px' }}
      />
    </div>
  );
}
