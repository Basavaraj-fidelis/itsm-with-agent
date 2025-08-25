import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from './components/ui/toaster';
import { ThemeProvider } from './components/theme-provider';
import ProtectedRoute from './components/auth/protected-route';
import { LoadingSpinner } from './components/ui/loading-spinner';
import { ErrorBoundary } from './components/ui/error-boundary';

// Lazy load components
const Login = React.lazy(() => import('./pages/login'));
const Dashboard = React.lazy(() => import('./pages/dashboard'));
const Agents = React.lazy(() => import('./pages/agents'));
const AgentDetail = React.lazy(() => import('./pages/agent-detail'));
const Tickets = React.lazy(() => import('./pages/tickets'));
const TicketDetail = React.lazy(() => import('./pages/ticket-detail'));
const CreateTicket = React.lazy(() => import('./pages/create-ticket'));
const Alerts = React.lazy(() => import('./pages/alerts'));
const Settings = React.lazy(() => import('./pages/settings'));
const Users = React.lazy(() => import('./pages/users'));
const KnowledgeBase = React.lazy(() => import('./pages/knowledge-base'));
const Reports = React.lazy(() => import('./pages/reports'));
const SecurityDashboard = React.lazy(() => import('./pages/security-dashboard'));
const PerformanceAnalytics = React.lazy(() => import('./pages/performance-analytics'));
const SLAManagement = React.lazy(() => import('./pages/sla-management'));
const EndUserPortal = React.lazy(() => import('./pages/end-user-portal'));
const NotFound = React.lazy(() => import('./pages/not-found'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 404 || error?.status === 401) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="app-theme">
          <Router>
            <div className="min-h-screen bg-background">
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/portal" element={<EndUserPortal />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />

                  {/* Protected Routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />

                  <Route path="/agents" element={
                    <ProtectedRoute>
                      <Agents />
                    </ProtectedRoute>
                  } />

                  <Route path="/agents/:id" element={
                    <ProtectedRoute>
                      <AgentDetail />
                    </ProtectedRoute>
                  } />

                  <Route path="/tickets" element={
                    <ProtectedRoute>
                      <Tickets />
                    </ProtectedRoute>
                  } />

                  <Route path="/tickets/:id" element={
                    <ProtectedRoute>
                      <TicketDetail />
                    </ProtectedRoute>
                  } />

                  <Route path="/create-ticket" element={
                    <ProtectedRoute>
                      <CreateTicket />
                    </ProtectedRoute>
                  } />

                  <Route path="/alerts" element={
                    <ProtectedRoute>
                      <Alerts />
                    </ProtectedRoute>
                  } />

                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } />

                  <Route path="/users" element={
                    <ProtectedRoute>
                      <Users />
                    </ProtectedRoute>
                  } />

                  <Route path="/knowledge-base" element={
                    <ProtectedRoute>
                      <KnowledgeBase />
                    </ProtectedRoute>
                  } />

                  <Route path="/reports" element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  } />

                  <Route path="/security" element={
                    <ProtectedRoute>
                      <SecurityDashboard />
                    </ProtectedRoute>
                  } />

                  <Route path="/performance" element={
                    <ProtectedRoute>
                      <PerformanceAnalytics />
                    </ProtectedRoute>
                  } />

                  <Route path="/sla" element={
                    <ProtectedRoute>
                      <SLAManagement />
                    </ProtectedRoute>
                  } />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <Toaster />
            </div>
          </Router>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;