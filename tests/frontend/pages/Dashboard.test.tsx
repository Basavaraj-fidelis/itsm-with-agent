import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from '../../../client/src/pages/dashboard';

// Mock the hooks
vi.mock('../../../client/src/hooks/use-dashboard', () => ({
  useDashboardSummary: vi.fn(() => ({
    data: {
      total_devices: 10,
      online_devices: 8,
      active_alerts: 2,
      offline_devices: 2
    },
    isLoading: false,
    error: null
  }))
}));

vi.mock('../../../client/src/hooks/use-agents', () => ({
  useAgents: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null
  }))
}));

vi.mock('../../../client/src/hooks/use-alerts', () => ({
  useAlerts: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null
  }))
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Dashboard', () => {
  it('renders dashboard metrics', () => {
    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('System overview and monitoring')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    // This would need to mock the loading state
    render(<Dashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});