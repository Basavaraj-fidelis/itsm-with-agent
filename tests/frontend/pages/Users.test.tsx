import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Users from '../../../client/src/pages/users';

// Mock the API
vi.mock('../../../client/src/lib/api', () => ({
  api: {
    getUsers: vi.fn(),
  },
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

const mockUsers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    is_active: true,
    last_login: '2024-01-15T10:30:00Z',
    created_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'technician',
    is_active: false,
    last_login: null,
    created_at: '2023-06-01T00:00:00Z'
  }
];

describe('Users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { api } = require('../../../client/src/lib/api');
    api.getUsers.mockResolvedValue(mockUsers);
  });

  it('renders users page with header', async () => {
    render(<Users />, { wrapper: createWrapper() });

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Manage system users and permissions')).toBeInTheDocument();
  });

  it('displays new user button', async () => {
    render(<Users />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /new user/i })).toBeInTheDocument();
  });

  it('displays search and filter controls', async () => {
    render(<Users />, { wrapper: createWrapper() });

    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
    expect(screen.getByText('All Roles')).toBeInTheDocument();
    expect(screen.getByText('All Status')).toBeInTheDocument();
  });

  it('displays users in table', async () => {
    render(<Users />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });
  });

  it('filters users by search term', async () => {
    render(<Users />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('filters users by role', async () => {
    render(<Users />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the role filter dropdown
    const roleSelect = screen.getByDisplayValue('All Roles');
    fireEvent.click(roleSelect);

    // Select admin role
    const adminOption = screen.getByText('Admin');
    fireEvent.click(adminOption);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('filters users by status', async () => {
    render(<Users />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the status filter dropdown
    const statusSelect = screen.getByDisplayValue('All Status');
    fireEvent.click(statusSelect);

    // Select inactive status
    const inactiveOption = screen.getByText('Inactive');
    fireEvent.click(inactiveOption);

    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('displays user actions dropdown', async () => {
    render(<Users />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the actions button
    const actionsButtons = screen.getAllByRole('button', { name: /open menu/i });
    fireEvent.click(actionsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Make admin')).toBeInTheDocument();
    });
  });

  it('shows loading state', async () => {
    const { api } = require('../../../client/src/lib/api');
    api.getUsers.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<Users />, { wrapper: createWrapper() });

    expect(screen.getByTestId('loading-skeleton') || document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('handles error state', async () => {
    const { api } = require('../../../client/src/lib/api');
    api.getUsers.mockRejectedValue(new Error('Failed to fetch users'));

    render(<Users />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Error Loading Users')).toBeInTheDocument();
      expect(screen.getByText('Please refresh the page or try again later.')).toBeInTheDocument();
    });
  });
});