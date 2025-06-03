import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Tickets from '../../../client/src/pages/tickets';

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

describe('Tickets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tickets page with header', () => {
    render(<Tickets />, { wrapper: createWrapper() });

    expect(screen.getByText('Service Desk')).toBeInTheDocument();
    expect(screen.getByText('Manage tickets and service workflows')).toBeInTheDocument();
  });

  it('displays tickets and workflows toggle buttons', () => {
    render(<Tickets />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /tickets/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /workflows/i })).toBeInTheDocument();
  });

  it('shows new ticket button', () => {
    render(<Tickets />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /new ticket/i })).toBeInTheDocument();
  });

  it('displays search and filter controls', () => {
    render(<Tickets />, { wrapper: createWrapper() });

    expect(screen.getByPlaceholderText('Search tickets...')).toBeInTheDocument();
    expect(screen.getByText('All Types')).toBeInTheDocument();
    expect(screen.getByText('All Status')).toBeInTheDocument();
    expect(screen.getByText('All Priority')).toBeInTheDocument();
  });

  it('displays mock tickets', () => {
    render(<Tickets />, { wrapper: createWrapper() });

    expect(screen.getByText('REQ-2024-001')).toBeInTheDocument();
    expect(screen.getByText('New Software Installation Request')).toBeInTheDocument();
  });

  it('filters tickets by search term', async () => {
    render(<Tickets />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText('Search tickets...');
    fireEvent.change(searchInput, { target: { value: 'Software' } });

    await waitFor(() => {
      expect(screen.getByText('New Software Installation Request')).toBeInTheDocument();
    });
  });

  it('opens new ticket dialog when button is clicked', async () => {
    render(<Tickets />, { wrapper: createWrapper() });

    const newTicketButton = screen.getByRole('button', { name: /new ticket/i });
    fireEvent.click(newTicketButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Ticket')).toBeInTheDocument();
    });
  });

  it('switches to workflows view when workflows button is clicked', async () => {
    render(<Tickets />, { wrapper: createWrapper() });

    const workflowsButton = screen.getByRole('button', { name: /workflows/i });
    fireEvent.click(workflowsButton);

    await waitFor(() => {
      expect(screen.getByText('Service Desk Workflows')).toBeInTheDocument();
    });
  });
});