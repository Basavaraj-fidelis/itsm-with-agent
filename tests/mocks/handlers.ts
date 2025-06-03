
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Dashboard endpoints
  http.get('/api/dashboard/metrics', () => {
    return HttpResponse.json({
      totalDevices: 150,
      activeAlerts: 12,
      ticketsOpen: 34,
      systemHealth: 98.5
    })
  }),

  // Agents endpoints
  http.get('/api/agents', () => {
    return HttpResponse.json([
      {
        id: '1',
        hostname: 'test-agent-1',
        ip_address: '192.168.1.100',
        status: 'online',
        last_seen: new Date().toISOString(),
        os_type: 'Windows',
        os_version: '10.0.19042'
      }
    ])
  }),

  // Tickets endpoints
  http.get('/api/tickets', () => {
    return HttpResponse.json([
      {
        id: '1',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'open',
        priority: 'medium',
        created_at: new Date().toISOString()
      }
    ])
  }),

  // Knowledge Base endpoints
  http.get('/api/knowledge', () => {
    return HttpResponse.json([
      {
        id: '1',
        title: 'Test Article',
        content: 'Test Content',
        category: 'General',
        status: 'published'
      }
    ])
  }),

  // Alerts endpoints
  http.get('/api/alerts', () => {
    return HttpResponse.json([
      {
        id: '1',
        device_id: '1',
        alert_type: 'high_cpu',
        severity: 'warning',
        is_active: true,
        triggered_at: new Date().toISOString()
      }
    ])
  }),

  // Users endpoints
  http.get('/api/users', () => {
    return HttpResponse.json([
      {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      }
    ])
  }),

  // Auth endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({ token: 'mock-token', user: { id: '1', username: 'testuser' } })
  })
]
