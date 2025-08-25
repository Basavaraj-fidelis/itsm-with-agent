import { Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { createContext, useContext, useEffect, useState } from "react";

// Auth Context
const AuthContext = createContext<{
  user: any;
  login: (token: string, userData: any) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}>({
  user: null,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {}
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const login = (token: string, userData: any) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/login";
  };
  const refreshUser = async () => {
    try {
      const response = await apiRequest("GET", "/api/auth/verify");
      if (!response.ok) {
        throw new Error("Authentication failed");
      }
      const userData = await response.json();
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Failed to refresh user:", error);
      // Handle error appropriately, e.g., redirect to login
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallbackPath = "/login" 
}: ProtectedRouteProps) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No token found");
      }
      
      try {
        const response = await apiRequest("GET", "/api/auth/verify");
        if (!response.ok) {
          console.error("Auth verification failed:", response.status, response.statusText);
          // Clear invalid token
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
          throw new Error(`Authentication failed: ${response.status}`);
        }
        const userData = await response.json();
        console.log("Auth verification successful:", userData);
        return userData;
      } catch (fetchError) {
        console.error("Auth verification network error:", fetchError);
        // Clear invalid token
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        throw fetchError;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!localStorage.getItem("auth_token"), // Only run if token exists
  });

  // Check for token first
  const token = localStorage.getItem("auth_token");
  if (!token) {
    return <Redirect to={fallbackPath} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    // Clear storage and redirect
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    return <Redirect to={fallbackPath} />;
  }

  // Check if user is active
  if (!user.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Account Suspended</h2>
          <p className="text-neutral-600 mb-4">
            Your account has been suspended. Please contact your administrator.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("auth_token");
              localStorage.removeItem("user");
              window.location.href = "/login";
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Check role permissions
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasPermission = roles.includes(user.role) || user.role === "admin";

    if (!hasPermission) {
      // If end user tries to access restricted area, redirect to portal
      if (user.role === "end_user") {
        window.location.href = "/portal";
        return null;
      }

      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">Access Denied</h2>
            <p className="text-neutral-600 mb-4">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}