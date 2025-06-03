import { http, HttpResponse } from 'msw'

const baseURL = 'http://localhost:3000/api'

export const handlers = [
  // Dashboard
  http.get(`${baseURL}/dashboard/summary`, () => {
    return HttpResponse.json({
      total_devices: 10,
      online_devices: 8,
      offline_devices: 2,
      active_alerts: 3
    })
  }),

  // Agents
  http.get(`${baseURL}/agents`, () => {
    return HttpResponse.json([
      {
        id: '1',
        hostname: 'test-agent-1',
        assigned_user: 'user1',
        os_name: 'Windows',
        os_version: '10',
        ip_address: '192.168.1.100',
        status: 'online',
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        latest_report: {
          cpu_usage: '25.5',
          memory_usage: '60.2',
          disk_usage: '45.8',
          network_io: '1024',
          collected_at: new Date().toISOString()
        }
      }
    ])
  }),

  // Devices
  http.get(`${baseURL}/devices`, () => {
    return HttpResponse.json([
      {
        id: '1',
        hostname: 'test-device-1',
        assigned_user: 'user1',
        os_name: 'Windows',
        os_version: '10',
        ip_address: '192.168.1.100',
        status: 'online',
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
  }),

  // Alerts
  http.get(`${baseURL}/alerts`, () => {
    return HttpResponse.json([
      {
        id: '1',
        device_id: '1',
        category: 'performance',
        severity: 'high',
        message: 'High CPU usage detected',
        metadata: { cpu_usage: 85 },
        triggered_at: new Date().toISOString(),
        resolved_at: null,
        is_active: true,
        device_hostname: 'test-device-1'
      }
    ])
  }),

  // Users
  http.get(`${baseURL}/users`, () => {
    return HttpResponse.json([
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        department: 'IT',
        phone: '+1234567890',
        is_active: true,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
  }),

  // Tickets
  http.get(`${baseURL}/tickets`, () => {
    return HttpResponse.json([
      {
        id: 'REQ-2024-001',
        type: 'request',
        title: 'New Software Installation Request',
        description: 'Need Adobe Creative Suite installed',
        priority: 'medium',
        status: 'open',
        requester_email: 'user@example.com',
        assigned_to: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
  }),

  // Knowledge Base
  http.get(`${baseURL}/knowledge-base`, () => {
    return HttpResponse.json([
      {
        id: '1',
        title: 'How to reset password',
        content: 'Follow these steps...',
        category: 'account',
        status: 'published',
        author: 'Admin',
        views: 100,
        helpful_votes: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
  })
]