import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useEffect, useState } from "react";

// Import pages
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Agents from "@/pages/agents";
import AgentDetail from "@/pages/agent-detail";
import Alerts from "@/pages/alerts";
import Tickets from "@/pages/tickets";
import KnowledgeBase from "@/pages/knowledge-base";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";

// Layout
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Layout wrapper for authenticated pages
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-900">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check for authentication token on app load
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Dashboard />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute requiredRole={["admin", "manager", "technician"]}>
                <AuthenticatedLayout>
                  <Agents />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents/:id"
            element={
              <ProtectedRoute requiredRole={["admin", "manager", "technician"]}>
                <AuthenticatedLayout>
                  <AgentDetail />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute requiredRole={["admin", "manager", "technician"]}>
                <AuthenticatedLayout>
                  <Alerts />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Tickets />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/knowledge-base"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <KnowledgeBase />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRole={["admin", "manager"]}>
                <AuthenticatedLayout>
                  <Users />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRole={["admin"]}>
                <AuthenticatedLayout>
                  <Settings />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute requiredRole={["admin", "manager"]}>
                <AuthenticatedLayout>
                  <Reports />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          {/* Default redirects */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}