
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Tickets from '../client/src/pages/tickets.tsx';
import ServiceDeskWorkflows from '../client/src/components/tickets/service-desk-workflows.tsx';

// Mock API
vi.mock('../client/src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Service Desk Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Ticket Page Component', () => {
    it('should render ticket management interface', async () => {
      const mockTickets = {
        data: [
          {
            id: '1',
            ticket_number: 'REQ-2024-001',
            type: 'request',
            title: 'Software Installation',
            status: 'new',
            priority: 'medium',
            requester_email: 'user@company.com',
            created_at: new Date().toISOString()
          }
        ],
        total: 1,
        pages: 1,
        current_page: 1
      };

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTickets });

      render(<Tickets />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Service Desk')).toBeInTheDocument();
        expect(screen.getByText('REQ-2024-001')).toBeInTheDocument();
      });
    });

    it('should filter tickets by type', async () => {
      const mockTickets = {
        data: [
          {
            id: '1',
            ticket_number: 'INC-2024-001',
            type: 'incident',
            title: 'Server Down',
            status: 'assigned',
            priority: 'critical'
          }
        ],
        total: 1,
        pages: 1,
        current_page: 1
      };

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTickets });

      render(<Tickets />, { wrapper: createWrapper() });

      await waitFor(() => {
        const typeFilter = screen.getByDisplayValue('All Types');
        fireEvent.click(typeFilter);
      });

      const incidentOption = screen.getByText('Incidents');
      fireEvent.click(incidentOption);

      await waitFor(() => {
        expect(vi.mocked(api.get)).toHaveBeenCalledWith(
          expect.stringContaining('type=incident')
        );
      });
    });

    it('should create new ticket', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          id: '123',
          ticket_number: 'REQ-2024-002',
          type: 'request',
          title: 'New Request'
        }
      });

      render(<Tickets />, { wrapper: createWrapper() });

      const createButton = screen.getByText('Create Ticket');
      fireEvent.click(createButton);

      // Fill form fields
      const titleInput = screen.getByLabelText('Title');
      fireEvent.change(titleInput, { target: { value: 'Test Ticket' } });

      const descriptionInput = screen.getByLabelText('Description');
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(api.post)).toHaveBeenCalledWith('/api/tickets', {
          title: 'Test Ticket',
          description: 'Test Description',
          type: 'request',
          priority: 'medium'
        });
      });
    });

    it('should search tickets', async () => {
      render(<Tickets />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText('Search tickets...');
      fireEvent.change(searchInput, { target: { value: 'server issue' } });

      await waitFor(() => {
        expect(vi.mocked(api.get)).toHaveBeenCalledWith(
          expect.stringContaining('search=server%20issue')
        );
      });
    });

    it('should display ticket analytics', async () => {
      const mockAnalytics = {
        total_tickets: 150,
        open_tickets: 45,
        resolved_tickets: 105,
        ticket_trends: [
          { date: '2024-01-01', count: 10 },
          { date: '2024-01-02', count: 15 }
        ]
      };

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockAnalytics });

      render(<Tickets />, { wrapper: createWrapper() });

      // Switch to analytics view
      const analyticsTab = screen.getByText('Analytics');
      fireEvent.click(analyticsTab);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Total tickets
        expect(screen.getByText('45')).toBeInTheDocument(); // Open tickets
      });
    });
  });

  describe('Service Desk Workflows Component', () => {
    it('should render workflow templates', () => {
      render(<ServiceDeskWorkflows />, { wrapper: createWrapper() });

      expect(screen.getByText('Service Request')).toBeInTheDocument();
      expect(screen.getByText('Incident Management')).toBeInTheDocument();
      expect(screen.getByText('Problem Management')).toBeInTheDocument();
      expect(screen.getByText('Change Management')).toBeInTheDocument();
    });

    it('should show workflow steps', () => {
      render(<ServiceDeskWorkflows />, { wrapper: createWrapper() });

      expect(screen.getByText('Request Submitted')).toBeInTheDocument();
      expect(screen.getByText('Initial Review')).toBeInTheDocument();
      expect(screen.getByText('Approval Process')).toBeInTheDocument();
    });

    it('should display step status indicators', () => {
      render(<ServiceDeskWorkflows />, { wrapper: createWrapper() });

      // Check for completed, active, and pending step indicators
      const completedSteps = screen.getAllByRole('img', { name: /completed/i });
      const activeSteps = screen.getAllByRole('img', { name: /active/i });
      
      expect(completedSteps.length).toBeGreaterThan(0);
      expect(activeSteps.length).toBeGreaterThan(0);
    });
  });

  describe('Ticket Form Validation', () => {
    it('should validate required fields', async () => {
      render(<Tickets />, { wrapper: createWrapper() });

      const createButton = screen.getByText('Create Ticket');
      fireEvent.click(createButton);

      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
        expect(screen.getByText('Description is required')).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<Tickets />, { wrapper: createWrapper() });

      const createButton = screen.getByText('Create Ticket');
      fireEvent.click(createButton);

      const emailInput = screen.getByLabelText('Requester Email');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });
  });

  describe('Ticket Status Management', () => {
    it('should update ticket status', async () => {
      const mockTicket = {
        id: '1',
        ticket_number: 'REQ-2024-001',
        status: 'new',
        title: 'Test Ticket'
      };

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTicket });
      vi.mocked(api.put).mockResolvedValueOnce({ 
        data: { ...mockTicket, status: 'assigned' }
      });

      render(<Tickets />, { wrapper: createWrapper() });

      await waitFor(() => {
        const statusDropdown = screen.getByDisplayValue('new');
        fireEvent.click(statusDropdown);
      });

      const assignedOption = screen.getByText('assigned');
      fireEvent.click(assignedOption);

      await waitFor(() => {
        expect(vi.mocked(api.put)).toHaveBeenCalledWith(
          '/api/tickets/1',
          { status: 'assigned' }
        );
      });
    });
  });

  describe('SLA Indicators', () => {
    it('should show SLA status for tickets', async () => {
      const mockTickets = {
        data: [
          {
            id: '1',
            ticket_number: 'INC-2024-001',
            priority: 'critical',
            sla_breached: true,
            sla_response_due: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
          }
        ]
      };

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockTickets });

      render(<Tickets />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('SLA Breached')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should export tickets to CSV', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockBlob });

      render(<Tickets />, { wrapper: createWrapper() });

      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(vi.mocked(api.get)).toHaveBeenCalledWith(
          '/api/tickets/export/csv',
          expect.objectContaining({
            responseType: 'blob'
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network Error'));

      render(<Tickets />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Failed to load tickets')).toBeInTheDocument();
      });
    });

    it('should show loading states', async () => {
      vi.mocked(api.get).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<Tickets />, { wrapper: createWrapper() });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<Tickets />, { wrapper: createWrapper() });

      // Check for mobile-specific elements or layouts
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });
  });
});
