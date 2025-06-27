import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function VPNManagement() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard since VPN management is deprecated
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="p-6">
      <p>VPN Management has been deprecated. Redirecting to dashboard...</p>
    </div>
  );
}