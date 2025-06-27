import React, { useEffect, useState, lazy } from "react";
import { Router, Route, Switch, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute, AuthProvider } from "@/components/auth/protected-route";

// Import pages
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Agents from "@/pages/agents";
import AgentDetail from "@/pages/agent-detail";
import Alerts from "@/pages/alerts";
import TicketDetail from "@/pages/ticket-detail";
import CreateTicket from "@/pages/create-ticket";
import Tickets from "@/pages/tickets";
import KnowledgeBase from "@/pages/knowledge-base";
import NewArticle from "@/pages/new-article";
import Notifications from "@/pages/notifications";
import Profile from "@/pages/profile";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import Reports from "@/pages/reports";
import VNCPage from "@/pages/vnc";
import RDPPage from "@/pages/rdp";
import SSHPage from "@/pages/ssh";
import NotFound from "@/pages/not-found";
import ActiveDirectory from "@/pages/active-directory";
import ITSMComparison from "@/pages/itsm-comparison";
import PatchCompliancePage from "@/pages/patch-compliance";



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
    const token = localStorage.getItem('auth_token');
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
      <AuthProvider>
        <Router>
          <Switch>
            {/* Public routes */}
            <Route path="/login">
              <Login />
            </Route>
            <Route path="/signup">
              <Signup />
            </Route>

            {/* Protected routes */}
            <Route path="/dashboard">
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Dashboard />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

            <Route path="/agents/:id">
              <ProtectedRoute requiredRole={["admin", "manager", "technician"]}>
                <AuthenticatedLayout>
                  <AgentDetail />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

            <Route path="/agents">
              <ProtectedRoute requiredRole={["admin", "manager", "technician"]}>
                <AuthenticatedLayout>
                  <Agents />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

            <Route path="/alerts">
              <ProtectedRoute requiredRole={["admin", "manager", "technician"]}>
                <AuthenticatedLayout>
                  <Alerts />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

            <Route path="/tickets">
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Tickets />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>
            <Route path="/tickets/:id">
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <TicketDetail />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>
             <Route path="/create-ticket">
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <CreateTicket />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

            <Route path="/knowledge-base">
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <KnowledgeBase />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

            <Route path="/knowledge-base/new">
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <NewArticle />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>
            <Route path="/knowledge-base/:articleId">
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <KnowledgeBase />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

            <Route path="/users">
              <ProtectedRoute requiredRole={["admin", "manager"]}>
                <AuthenticatedLayout>
                  <Users />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>





            <Route path="/settings/:section?">
              <ProtectedRoute requiredRole={["admin", "manager"]}>
                <AuthenticatedLayout>
                  <Settings />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

            <Route path="/profile">
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Profile />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

             <Route path="/notifications">
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Notifications />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

            <Route path="/reports">
              <ProtectedRoute requiredRole={["admin", "manager"]}>
                <AuthenticatedLayout>
                  <Reports />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

            <Route path="/itsm-comparison">
              <ProtectedRoute requiredRole={["admin", "manager"]}>
                <AuthenticatedLayout>
                  <ITSMComparison />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

             <Route path="/vnc">
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <VNCPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>
             <Route path="/rdp">
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <RDPPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>
            <Route path="/ssh">
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <SSHPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

            <Route path="/patch-compliance">
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <PatchCompliancePage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            </Route>

            


            {/* Default redirect */}
            <Route path="/">
              {isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
            </Route>

            {/* 404 route */}
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}