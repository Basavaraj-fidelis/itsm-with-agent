
import express from 'express'
import cors from 'cors'
import { router } from './routes'

export function createServer(): express.Application {
  const app = express()
  
  app.use(cors())
  app.use(express.json())
  app.use('/api', router)
  
  return app
}
import express from 'express'
import cors from 'cors'

export function createServer() {
  const app = express()
  
  app.use(cors())
  app.use(express.json())

  // Mock dashboard routes
  app.get('/api/dashboard/metrics', (req, res) => {
    if (req.query.forceError) {
      return res.status(500).json({ error: 'Forced error' })
    }
    res.json({
      totalDevices: 150,
      activeAlerts: 12,
      ticketsOpen: 34,
      systemHealth: 85
    })
  })

  app.get('/api/dashboard/performance', (req, res) => {
    const { from, to } = req.query
    if (from === 'invalid-date') {
      return res.status(400).json({ error: 'Invalid date format' })
    }
    res.json([
      {
        timestamp: '2024-01-01T00:00:00Z',
        cpu_usage: 65.2,
        memory_usage: 78.5
      }
    ])
  })

  app.get('/api/dashboard/system-health', (req, res) => {
    res.json({
      overall_health: 85,
      components: [
        { name: 'Database', status: 'healthy' },
        { name: 'API', status: 'healthy' }
      ]
    })
  })

  // Mock agents routes
  app.get('/api/agents', (req, res) => {
    const { status, os_type } = req.query
    let agents = [
      {
        id: 'agent-1',
        hostname: 'test-agent-1',
        ip_address: '192.168.1.100',
        status: 'online',
        os_type: 'Windows',
        last_seen: new Date().toISOString()
      }
    ]
    
    if (status) {
      agents = agents.filter(agent => agent.status === status)
    }
    if (os_type) {
      agents = agents.filter(agent => agent.os_type === os_type)
    }
    
    res.json(agents)
  })

  app.get('/api/agents/:id', (req, res) => {
    const { id } = req.params
    if (id === 'non-existent-id') {
      return res.status(404).json({ error: 'Agent not found' })
    }
    res.json({
      id,
      hostname: 'test-agent-1',
      system_info: { cpu_count: 4, memory_total: 8589934592 },
      metrics: { cpu_usage: 25.5, memory_usage: 65.2 }
    })
  })

  app.post('/api/agents/:id/actions', (req, res) => {
    const { action } = req.body
    if (action === 'invalid_action') {
      return res.status(400).json({ error: 'Invalid action' })
    }
    res.json({ success: true, message: 'Action executed' })
  })

  app.post('/api/report', (req, res) => {
    const { hostname, ip_address } = req.body
    if (!hostname || !ip_address) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    res.json({ message: 'Report saved successfully' })
  })

  // Mock tickets routes
  app.get('/api/tickets', (req, res) => {
    const { status, priority } = req.query
    let tickets = [
      {
        id: 'ticket-1',
        title: 'Test Ticket',
        description: 'Test description',
        status: 'open',
        priority: 'medium',
        created_at: new Date().toISOString()
      }
    ]
    
    if (status) {
      tickets = tickets.filter(ticket => ticket.status === status)
    }
    if (priority) {
      tickets = tickets.filter(ticket => ticket.priority === priority)
    }
    
    res.json(tickets)
  })

  app.post('/api/tickets', (req, res) => {
    const { title, description, priority } = req.body
    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }
    if (priority && !['low', 'medium', 'high', 'critical'].includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' })
    }
    res.status(201).json({
      id: 'new-ticket-id',
      title,
      description,
      priority: priority || 'medium',
      status: 'open',
      created_at: new Date().toISOString()
    })
  })

  app.get('/api/tickets/:id', (req, res) => {
    const { id } = req.params
    if (id === 'non-existent-id') {
      return res.status(404).json({ error: 'Ticket not found' })
    }
    res.json({
      id,
      title: 'Test Ticket',
      description: 'Test description',
      status: 'open',
      priority: 'medium',
      comments: [],
      created_at: new Date().toISOString()
    })
  })

  app.put('/api/tickets/:id', (req, res) => {
    const { id } = req.params
    const updates = req.body
    res.json({
      id,
      ...updates,
      updated_at: new Date().toISOString()
    })
  })

  app.post('/api/tickets/:id/comments', (req, res) => {
    const { content, author } = req.body
    res.status(201).json({
      id: 'comment-id',
      content,
      author,
      created_at: new Date().toISOString()
    })
  })

  // Mock knowledge base routes
  app.get('/api/knowledge', (req, res) => {
    const { category, search, status } = req.query
    let articles = [
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
    ]
    
    if (category) {
      articles = articles.filter(article => article.category.toLowerCase() === category.toLowerCase())
    }
    if (status) {
      articles = articles.filter(article => article.status === status)
    }
    
    res.json(articles)
  })

  app.post('/api/knowledge', (req, res) => {
    const { title, content, category } = req.body
    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }
    if (category && !['general', 'troubleshooting', 'setup'].includes(category.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid category' })
    }
    res.status(201).json({
      id: 'new-article-id',
      title,
      content,
      category: category || 'general',
      status: 'draft',
      views: 0,
      helpful_votes: 0,
      created_at: new Date().toISOString()
    })
  })

  app.get('/api/knowledge/:id', (req, res) => {
    const { id } = req.params
    if (id === 'non-existent-id') {
      return res.status(404).json({ error: 'Article not found' })
    }
    res.json({
      id,
      title: 'Test Article',
      content: 'Test content',
      category: 'general',
      status: 'published',
      views: 11,
      helpful_votes: 5,
      created_at: new Date().toISOString()
    })
  })

  app.put('/api/knowledge/:id', (req, res) => {
    const { id } = req.params
    const updates = req.body
    res.json({
      id,
      ...updates,
      updated_at: new Date().toISOString()
    })
  })

  app.post('/api/knowledge/:id/vote', (req, res) => {
    res.json({ message: 'Vote recorded successfully' })
  })

  // Mock alerts routes
  app.get('/api/alerts', (req, res) => {
    const { severity, active, device_id } = req.query
    let alerts = [
      {
        id: 'alert-1',
        device_id: 'device-1',
        alert_type: 'high_cpu',
        severity: 'warning',
        message: 'CPU usage is high',
        is_active: true,
        triggered_at: new Date().toISOString()
      }
    ]
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity)
    }
    if (active !== undefined) {
      alerts = alerts.filter(alert => alert.is_active === (active === 'true'))
    }
    if (device_id) {
      alerts = alerts.filter(alert => alert.device_id === device_id)
    }
    
    res.json(alerts)
  })

  app.post('/api/alerts', (req, res) => {
    const { device_id, alert_type, severity } = req.body
    if (!device_id || !severity) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (!['critical', 'high', 'warning', 'info'].includes(severity)) {
      return res.status(400).json({ error: 'Invalid severity' })
    }
    res.status(201).json({
      id: 'new-alert-id',
      device_id,
      alert_type,
      severity,
      is_active: true,
      triggered_at: new Date().toISOString()
    })
  })

  app.get('/api/alerts/:id', (req, res) => {
    const { id } = req.params
    if (id === 'non-existent-id') {
      return res.status(404).json({ error: 'Alert not found' })
    }
    res.json({
      id,
      device_id: 'device-1',
      alert_type: 'high_cpu',
      severity: 'warning',
      is_active: true,
      triggered_at: new Date().toISOString()
    })
  })

  app.post('/api/alerts/:id/acknowledge', (req, res) => {
    res.json({ message: 'Alert acknowledged successfully' })
  })

  app.post('/api/alerts/:id/resolve', (req, res) => {
    res.json({ message: 'Alert resolved successfully' })
  })

  app.get('/api/alerts/stats', (req, res) => {
    res.json({
      total_alerts: 50,
      active_alerts: 12,
      alerts_by_severity: { critical: 2, high: 5, warning: 3, info: 2 },
      alerts_by_type: { high_cpu: 4, high_memory: 3, disk_space: 2 }
    })
  })

  // Mock users routes
  app.get('/api/users', (req, res) => {
    const { role, search } = req.query
    let users = [
      {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        created_at: new Date().toISOString()
      }
    ]
    
    if (role) {
      users = users.filter(user => user.role === role)
    }
    
    res.json(users)
  })

  app.post('/api/users', (req, res) => {
    const { username, email, password, role } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }
    if (email && !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' })
    }
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    if (username === 'duplicate_test') {
      return res.status(409).json({ error: 'Username already exists' })
    }
    res.status(201).json({
      id: 'new-user-id',
      username,
      email,
      role: role || 'user',
      created_at: new Date().toISOString()
    })
  })

  app.get('/api/users/:id', (req, res) => {
    const { id } = req.params
    if (id === 'non-existent-id') {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({
      id,
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      created_at: new Date().toISOString()
    })
  })

  app.put('/api/users/:id', (req, res) => {
    const { email } = req.body
    if (email && !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' })
    }
    res.json({
      id: req.params.id,
      ...req.body,
      updated_at: new Date().toISOString()
    })
  })

  app.delete('/api/users/:id', (req, res) => {
    res.json({ message: 'User deleted successfully' })
  })

  return app
}
