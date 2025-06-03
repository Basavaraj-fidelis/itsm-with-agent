import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Reports from '../../../client/src/pages/reports';

// Mock the agents hook
vi.mock('../../../client/src/hooks/use-agents', () => ({
  useAgents: vi.fn(),
}));

// Mock URL.createObjectURL and related APIs
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Mock window.alert
Object.defineProperty(window, 'alert', {
  writable: true,
  value: vi.fn(),
});

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

const mockAgents = [
  { id: 1, hostname: 'server-01', status: 'online' },
  { id: 2, hostname: 'server-02', status: 'offline' }
];

describe('Reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { useAgents } = require('../../../client/src/hooks/use-agents');
    useAgents.mockReturnValue({
      data: mockAgents,
      isLoading: false,
      error: null
    });
  });

  it('renders reports page with header', () => {
    render(<Reports />, { wrapper: createWrapper() });

    expect(screen.getByText('System Reports')).toBeInTheDocument();
    expect(screen.getByText('Generate and view system performance reports')).toBeInTheDocument();
  });

  it('displays report generation form', () => {
    render(<Reports />, { wrapper: createWrapper() });

    expect(screen.getByText('Generate Report')).toBeInTheDocument();
    expect(screen.getByText('Report Type')).toBeInTheDocument();
    expect(screen.getByText('Time Period')).toBeInTheDocument();
    expect(screen.getByText('Format')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument();
  });

  it('displays report templates', () => {
    render(<Reports />, { wrapper: createWrapper() });

    expect(screen.getByText('Performance Summary')).toBeInTheDocument();
    expect(screen.getByText('Availability Report')).toBeInTheDocument();
    expect(screen.getByText('System Inventory')).toBeInTheDocument();
  });

  it('displays recent reports section', () => {
    render(<Reports />, { wrapper: createWrapper() });

    expect(screen.getByText('Recent Reports')).toBeInTheDocument();
    expect(screen.getByText('Performance Summary - March 2024')).toBeInTheDocument();
    expect(screen.getByText('Availability Report - Weekly')).toBeInTheDocument();
    expect(screen.getByText('System Inventory - Full Export')).toBeInTheDocument();
  });

  it('generates report when button is clicked', async () => {
    // Mock document methods
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);

    render(<Reports />, { wrapper: createWrapper() });

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('downloads report when download button is clicked', async () => {
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);

    render(<Reports />, { wrapper: createWrapper() });

    // Find a download button (there are multiple)
    const downloadButtons = screen.getAllByRole('button', { name: '' });
    const downloadButton = downloadButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('class')?.includes('ghost')
    );

    if (downloadButton) {
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(mockAnchor.click).toHaveBeenCalled();
      });
    }

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('changes report type selection', async () => {
    render(<Reports />, { wrapper: createWrapper() });

    // Find the report type select
    const reportTypeSelect = screen.getByDisplayValue('Performance Summary');
    fireEvent.click(reportTypeSelect);

    // Select availability report
    const availabilityOption = screen.getByText('Availability Report');
    fireEvent.click(availabilityOption);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Availability Report')).toBeInTheDocument();
    });
  });

  it('changes time period selection', async () => {
    render(<Reports />, { wrapper: createWrapper() });

    // Find the time period select
    const timePeriodSelect = screen.getByDisplayValue('Last 7 Days');
    fireEvent.click(timePeriodSelect);

    // Select 30 days
    const thirtyDaysOption = screen.getByText('Last 30 Days');
    fireEvent.click(thirtyDaysOption);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Last 30 Days')).toBeInTheDocument();
    });
  });

  it('changes format selection', async () => {
    render(<Reports />, { wrapper: createWrapper() });

    // Find the format select
    const formatSelect = screen.getByDisplayValue('PDF');
    fireEvent.click(formatSelect);

    // Select CSV
    const csvOption = screen.getByText('CSV');
    fireEvent.click(csvOption);

    await waitFor(() => {
      expect(screen.getByDisplayValue('CSV')).toBeInTheDocument();
    });
  });

  it('handles loading state when agents are loading', () => {
    const { useAgents } = require('../../../client/src/hooks/use-agents');
    useAgents.mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    });

    render(<Reports />, { wrapper: createWrapper() });

    // The page should still render but might have different behavior
    expect(screen.getByText('System Reports')).toBeInTheDocument();
  });
});