
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import Users from '../../../client/src/pages/users'

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('Users', () => {
  const user = userEvent.setup()

  it('renders users list correctly', async () => {
    renderWithQueryClient(<Users />)
    
    expect(screen.getByText('Users')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('user')).toBeInTheDocument()
    })
  })

  it('searches users by username', async () => {
    renderWithQueryClient(<Users />)
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search users/i)
    await user.type(searchInput, 'test')

    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('filters users by role', async () => {
    renderWithQueryClient(<Users />)
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    const roleFilter = screen.getByRole('combobox', { name: /role/i })
    await user.click(roleFilter)
    await user.click(screen.getByText('User'))

    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('opens create user modal', async () => {
    renderWithQueryClient(<Users />)
    
    const createButton = screen.getByRole('button', { name: /create user/i })
    await user.click(createButton)

    expect(screen.getByText('Create New User')).toBeInTheDocument()
  })

  it('creates a new user successfully', async () => {
    renderWithQueryClient(<Users />)
    
    const createButton = screen.getByRole('button', { name: /create user/i })
    await user.click(createButton)

    await user.type(screen.getByLabelText(/username/i), 'newuser')
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    
    const roleSelect = screen.getByRole('combobox', { name: /role/i })
    await user.click(roleSelect)
    await user.click(screen.getByText('Admin'))

    const submitButton = screen.getByRole('button', { name: /create/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByText('Create New User')).not.toBeInTheDocument()
    })
  })
})
