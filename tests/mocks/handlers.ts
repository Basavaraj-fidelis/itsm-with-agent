
import { http, HttpResponse } from 'msw'

// Mock data
const mockAgents = [
  {
    id: 1,
    hostname: 'web-server-01',
    ip_address: '192.168.1.100',
    operating_system: 'Ubuntu 20.04',
    status: 'online',
    last_seen: '2024-01-15T10:30:00Z',
    cpu_usage: 45.2,
    memory_usage: 78.5,
    disk_usage: 65.3,
    uptime: 172800
  },
  {
    id: 2,
    hostname: 'db-server-01',
    ip_address: '192.168.1.101',
    operating_system: 'Windows Server 2019',
    status: 'offline',
    last_seen: '2024-01-14T15:20:00Z',
    cpu_usage: 23.1,
    memory_usage: 56.8,
    disk_usage: 42.7,
    uptime: 86400
  }
]

const mockTickets = [
  {
    id: 'REQ-2024-001',
    title: 'New Software Installation Request',
    description: 'Install Adobe Creative Suite on marketing team computers',
    status: 'open',
    priority: 'medium',
    category: 'software',
    assigned_to: 'John Tech',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T09:00:00Z',
    comments: []
  },
  {
    id: 'INC-2024-002',
    title: 'Email Server Down',
    description: 'Users cannot access email services',
    status: 'in_progress',
    priority: 'high',
    category: 'infrastructure',
    assigned_to: 'Sarah Admin',
    created_at: '2024-01-14T14:30:00Z',
    updated_at: '2024-01-15T08:15:00Z',
    comments: [
      {
        id: 1,
        content: 'Investigating the issue',
        author: 'Sarah Admin',
        created_at: '2024-01-15T08:15:00Z'
      }
    ]
  }
]

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
]

const mockAlerts = [
  {
    id: 1,
    title: 'High CPU Usage',
    description: 'Server CPU usage exceeded 90%',
    severity: 'critical',
    status: 'active',
    source: 'web-server-01',
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    title: 'Disk Space Low',
    description: 'Disk space on db-server-01 is below 10%',
    severity: 'warning',
    status: 'acknowledged',
    source: 'db-server-01',
    created_at: '2024-01-14T16:30:00Z'
  }
]

const mockDashboardMetrics = {
  totalAgents: 15,
  onlineAgents: 12,
  offlineAgents: 3,
  openTickets: 8,
  criticalAlerts: 3,
  averageResponseTime: 45,
  systemUptime: 99.8,
  resourceUtilization: 67
}

const mockKnowledgeArticles = [
  {
    id: 1,
    title: 'How to Reset User Password',
    content: 'Step-by-step guide to reset user passwords...',
    category: 'User Management',
    author: 'Admin',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    views: 245,
    helpful_votes: 18,
    not_helpful_votes: 2
  },
  {
    id: 2,
    title: 'Troubleshooting Network Connectivity',
    content: 'Common network issues and solutions...',
    category: 'Networking',
    author: 'Tech Support',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-10T15:30:00Z',
    views: 189,
    helpful_votes: 15,
    not_helpful_votes: 1
  }
]

export const handlers = [
  // Dashboard endpoints
  http.get('/api/dashboard/metrics', () => {
    return HttpResponse.json(mockDashboardMetrics)
  }),

  // Agents endpoints
  http.get('/api/agents', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    
    if (status && status !== 'all') {
      const filtered = mockAgents.filter(agent => agent.status === status)
      return HttpResponse.json(filtered)
    }
    
    return HttpResponse.json(mockAgents)
  }),

  http.get('/api/agents/:id', ({ params }) => {
    const agent = mockAgents.find(a => a.id === Number(params.id))
    if (!agent) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(agent)
  }),

  // Tickets endpoints
  http.get('/api/tickets', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const priority = url.searchParams.get('priority')
    
    let filtered = mockTickets
    
    if (status && status !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === status)
    }
    
    if (priority && priority !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priority)
    }
    
    return HttpResponse.json(filtered)
  }),

  http.post('/api/tickets', async ({ request }) => {
    const ticketData = await request.json() as any
    const newTicket = {
      id: `REQ-2024-${String(mockTickets.length + 1).padStart(3, '0')}`,
      ...ticketData,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      comments: []
    }
    
    if (!ticketData.title) {
      return HttpResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json(newTicket, { status: 201 })
  }),

  http.get('/api/tickets/:id', ({ params }) => {
    const ticket = mockTickets.find(t => t.id === params.id)
    if (!ticket) {
      return HttpResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(ticket)
  }),

  http.put('/api/tickets/:id', async ({ params, request }) => {
    const updateData = await request.json() as any
    const ticketIndex = mockTickets.findIndex(t => t.id === params.id)
    
    if (ticketIndex === -1) {
      return HttpResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }
    
    const updatedTicket = {
      ...mockTickets[ticketIndex],
      ...updateData,
      updated_at: new Date().toISOString()
    }
    
    return HttpResponse.json(updatedTicket)
  }),

  http.post('/api/tickets/:id/comments', async ({ params, request }) => {
    const commentData = await request.json() as any
    const newComment = {
      id: Date.now(),
      ...commentData,
      created_at: new Date().toISOString()
    }
    
    return HttpResponse.json(newComment, { status: 201 })
  }),

  // Users endpoints
  http.get('/api/users', () => {
    return HttpResponse.json(mockUsers)
  }),

  // Alerts endpoints
  http.get('/api/alerts', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    
    if (status && status !== 'all') {
      const filtered = mockAlerts.filter(alert => alert.status === status)
      return HttpResponse.json(filtered)
    }
    
    return HttpResponse.json(mockAlerts)
  }),

  // Knowledge Base endpoints
  http.get('/api/knowledge', () => {
    return HttpResponse.json(mockKnowledgeArticles)
  }),

  http.post('/api/knowledge', async ({ request }) => {
    const articleData = await request.json() as any
    const newArticle = {
      id: mockKnowledgeArticles.length + 1,
      ...articleData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      views: 0,
      helpful_votes: 0,
      not_helpful_votes: 0
    }
    
    return HttpResponse.json(newArticle, { status: 201 })
  }),

  http.get('/api/knowledge/:id', ({ params }) => {
    const article = mockKnowledgeArticles.find(a => a.id === Number(params.id))
    if (!article) {
      return HttpResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(article)
  }),

  // Report endpoint
  http.post('/api/report', () => {
    return HttpResponse.json({ message: 'Report saved successfully' })
  })
]
