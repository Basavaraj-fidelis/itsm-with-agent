
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

export default function VNCPage() {
  const vncRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  
  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const host = urlParams.get('host') || 'localhost';
    const port = urlParams.get('port') || '5900';
    
    // Load NoVNC
    const loadNoVNC = async () => {
      try {
        // Import NoVNC (you'll need to install novnc package or use CDN)
        const RFB = (window as any).RFB;
        
        if (!RFB) {
          // Load NoVNC from CDN if not available
          const script = document.createElement('script');
          script.src = 'https://novnc.com/noVNC/core/rfb.js';
          script.onload = () => initializeVNC();
          document.head.appendChild(script);
        } else {
          initializeVNC();
        }
      } catch (error) {
        console.error('Failed to load NoVNC:', error);
      }
    };

    const initializeVNC = () => {
      if (vncRef.current) {
        const RFB = (window as any).RFB;
        
        // WebSocket URL for VNC connection
        const wsUrl = `ws://${host}:${port}`;
        
        // Create RFB connection
        const rfb = new RFB(vncRef.current, wsUrl);
        
        // Handle connection events
        rfb.addEventListener('connect', () => {
          console.log('VNC connected');
        });
        
        rfb.addEventListener('disconnect', () => {
          console.log('VNC disconnected');
        });
        
        rfb.addEventListener('credentialsrequired', () => {
          const password = prompt('VNC Password:');
          if (password) {
            rfb.sendCredentials({ password });
          }
        });
      }
    };

    loadNoVNC();
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <div className="p-4 bg-gray-800 text-white">
        <h1 className="text-lg font-semibold">Remote Desktop Connection</h1>
        <p className="text-sm text-gray-300">
          Connecting to: {new URLSearchParams(window.location.search).get('host')}
        </p>
      </div>
      <div 
        ref={vncRef} 
        className="w-full h-[calc(100vh-80px)]"
        style={{ minHeight: '600px' }}
      />
    </div>
  );
}
