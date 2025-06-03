import { http, HttpResponse } from 'msw'

export const handlers = [
  // Dashboard API
  http.get('/api/dashboard/metrics', () => {
    return HttpResponse.json({
      totalDevices: 150,
      activeAlerts: 12,
      ticketsOpen: 34,
      systemHealth: 85
    })
  }),

  // Agents API
  http.get('/api/agents', () => {
    return HttpResponse.json([
      {
        id: 'agent-1',
        hostname: 'test-agent-1',
        ip_address: '192.168.1.100',
        status: 'online',
        os_type: 'Windows',
        last_seen: new Date().toISOString()
      }
    ])
  }),

  // Tickets API
  http.get('/api/tickets', () => {
    return HttpResponse.json([
      {
        id: 'ticket-1',
        title: 'Test Ticket',
        description: 'Test description',
        status: 'open',
        priority: 'medium',
        created_at: new Date().toISOString()
      }
    ])
  }),

  http.post('/api/tickets', () => {
    return HttpResponse.json({
      id: 'new-ticket-id',
      title: 'New Test Ticket',
      status: 'open',
      priority: 'high',
      created_at: new Date().toISOString()
    }, { status: 201 })
  }),

  // Knowledge Base API
  http.get('/api/knowledge', () => {
    return HttpResponse.json([
      {
        id: 'article-1',
        title: 'Test Article',
        content: 'Test content',
        category: 'General',
        status: 'published',
        views: 10,
        helpful_votes: 5,
        created_at: new Date().toISOString()
      }
    ])
  }),

  http.post('/api/knowledge', () => {
    return HttpResponse.json({
      id: 'new-article-id',
      title: 'New Test Article',
      category: 'Troubleshooting',
      status: 'draft',
      created_at: new Date().toISOString()
    }, { status: 201 })
  }),

  // Alerts API
  http.get('/api/alerts', () => {
    return HttpResponse.json([
      {
        id: 'alert-1',
        device_id: 'device-1',
        alert_type: 'high_cpu',
        severity: 'warning',
        message: 'CPU usage is high',
        is_active: true,
        triggered_at: new Date().toISOString()
      }
    ])
  }),

  http.post('/api/alerts/*/acknowledge', () => {
    return HttpResponse.json({ message: 'Alert acknowledged successfully' })
  }),

  http.post('/api/alerts/*/resolve', () => {
    return HttpResponse.json({ message: 'Alert resolved successfully' })
  }),

  // Users API
  http.get('/api/users', () => {
    return HttpResponse.json([
      {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        created_at: new Date().toISOString()
      }
    ])
  }),

  http.post('/api/users', () => {
    return HttpResponse.json({
      id: 'new-user-id',
      username: 'newuser',
      email: 'newuser@example.com',
      role: 'admin',
      created_at: new Date().toISOString()
    }, { status: 201 })
  }),
]