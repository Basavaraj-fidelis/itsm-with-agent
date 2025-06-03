
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Dashboard endpoints
  http.get('/api/dashboard/summary', () => {
    return HttpResponse.json({
      total_devices: 150,
      online_devices: 142,
      offline_devices: 8,
      total_alerts: 12,
      critical_alerts: 3,
      open_tickets: 34,
      system_health: 95.5
    })
  }),

  http.get('/api/dashboard/metrics', () => {
    return HttpResponse.json({
      totalDevices: 150,
      activeAlerts: 12,
      ticketsOpen: 34,
      systemHealth: 95.5
    })
  }),

  http.get('/api/dashboard/performance', () => {
    return HttpResponse.json([
      {
        timestamp: '2024-01-01T00:00:00Z',
        cpu_usage: 25.5,
        memory_usage: 65.2
      }
    ])
  }),

  http.get('/api/dashboard/system-health', () => {
    return HttpResponse.json({
      overall_health: 95.5,
      components: [
        { name: 'CPU', status: 'healthy', value: 25.5 },
        { name: 'Memory', status: 'warning', value: 75.2 }
      ]
    })
  }),

  // Agents endpoints
  http.get('/api/agents', () => {
    return HttpResponse.json([
      {
        id: 'agent-1',
        hostname: 'test-agent-1',
        ip_address: '192.168.1.100',
        status: 'online',
        os_type: 'Windows',
        last_seen: new Date().toISOString(),
        system_info: {},
        metrics: {}
      }
    ])
  }),

  http.get('/api/agents/:id', () => {
    return HttpResponse.json({
      id: 'agent-1',
      hostname: 'test-agent-1',
      ip_address: '192.168.1.100',
      status: 'online',
      system_info: {},
      metrics: {}
    })
  }),

  http.post('/api/agents/:id/actions', () => {
    return HttpResponse.json({
      success: true,
      message: 'Action executed successfully'
    })
  }),

  http.post('/api/report', () => {
    return HttpResponse.json({
      message: 'Report saved successfully'
    })
  }),

  // Tickets endpoints
  http.get('/api/tickets', () => {
    return HttpResponse.json([
      {
        id: 'ticket-1',
        title: 'Test Ticket',
        description: 'Test description',
        status: 'open',
        priority: 'medium',
        created_at: new Date().toISOString(),
        comments: []
      }
    ])
  }),

  http.post('/api/tickets', () => {
    return HttpResponse.json({
      id: 'ticket-new',
      title: 'New Test Ticket',
      description: 'Test description',
      status: 'open',
      priority: 'high',
      created_at: new Date().toISOString()
    }, { status: 201 })
  }),

  http.get('/api/tickets/:id', () => {
    return HttpResponse.json({
      id: 'ticket-1',
      title: 'Test Ticket',
      description: 'Test description',
      status: 'open',
      priority: 'medium',
      created_at: new Date().toISOString(),
      comments: []
    })
  }),

  http.put('/api/tickets/:id', () => {
    return HttpResponse.json({
      id: 'ticket-1',
      title: 'Test Ticket',
      status: 'in_progress',
      priority: 'high'
    })
  }),

  http.post('/api/tickets/:id/comments', () => {
    return HttpResponse.json({
      id: 'comment-1',
      content: 'This is a test comment',
      author: 'test_user',
      created_at: new Date().toISOString()
    }, { status: 201 })
  }),

  // Knowledge Base endpoints
  http.get('/api/knowledge', () => {
    return HttpResponse.json([
      {
        id: 'article-1',
        title: 'Test Article',
        content: 'Test content',
        category: 'General',
        status: 'published',
        created_at: new Date().toISOString()
      }
    ])
  }),

  http.post('/api/knowledge', () => {
    return HttpResponse.json({
      id: 'article-new',
      title: 'New Test Article',
      content: 'Test content',
      category: 'Troubleshooting',
      status: 'draft',
      created_at: new Date().toISOString()
    }, { status: 201 })
  }),

  http.get('/api/knowledge/:id', () => {
    return HttpResponse.json({
      id: 'article-1',
      title: 'Test Article',
      content: 'Test content',
      category: 'General',
      views: 10,
      helpful_votes: 5
    })
  }),

  http.put('/api/knowledge/:id', () => {
    return HttpResponse.json({
      id: 'article-1',
      title: 'Updated Test Article',
      status: 'published'
    })
  }),

  http.post('/api/knowledge/:id/vote', () => {
    return HttpResponse.json({
      message: 'Vote recorded successfully'
    })
  }),

  // Alerts endpoints
  http.get('/api/alerts', () => {
    return HttpResponse.json([
      {
        id: 'alert-1',
        device_id: 'device-1',
        alert_type: 'high_cpu',
        severity: 'warning',
        is_active: true,
        status: 'Active',
        triggered_at: new Date().toISOString()
      }
    ])
  }),

  http.post('/api/alerts', () => {
    return HttpResponse.json({
      id: 'alert-new',
      device_id: 'test-device-123',
      alert_type: 'high_cpu',
      severity: 'warning',
      is_active: true,
      triggered_at: new Date().toISOString()
    }, { status: 201 })
  }),

  http.get('/api/alerts/:id', () => {
    return HttpResponse.json({
      id: 'alert-1',
      device_id: 'test-device-details',
      alert_type: 'high_memory'
    })
  }),

  http.post('/api/alerts/:id/acknowledge', () => {
    return HttpResponse.json({
      message: 'Alert acknowledged successfully'
    })
  }),

  http.post('/api/alerts/:id/resolve', () => {
    return HttpResponse.json({
      message: 'Alert resolved successfully'
    })
  }),

  http.get('/api/alerts/stats', () => {
    return HttpResponse.json({
      total_alerts: 25,
      active_alerts: 12,
      alerts_by_severity: { critical: 3, warning: 9 },
      alerts_by_type: { high_cpu: 5, high_memory: 7 }
    })
  }),

  // Users endpoints
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
      id: 'user-new',
      username: 'testuser123',
      email: 'testuser123@example.com',
      role: 'user',
      created_at: new Date().toISOString()
    }, { status: 201 })
  }),

  http.get('/api/users/:id', () => {
    return HttpResponse.json({
      id: 'user-1',
      username: 'detailstest',
      email: 'details@example.com'
    })
  }),

  http.put('/api/users/:id', () => {
    return HttpResponse.json({
      id: 'user-1',
      email: 'updated@example.com',
      role: 'admin'
    })
  }),

  http.delete('/api/users/:id', () => {
    return HttpResponse.json({
      message: 'User deleted successfully'
    })
  })
]
