
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function VPNManagement() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to dashboard since VPN management is deprecated
    setLocation("/dashboard");
  }, [setLocation]);

  return (
    <div className="p-6">
      <p>VPN Management has been deprecated. Redirecting to dashboard...</p>
    </div>
  );
}
