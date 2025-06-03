
import request from 'supertest'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import { createServer } from '../../../server/test-server'

describe('Dashboard API', () => {
  let app: express.Application
  let server: any

  beforeEach(async () => {
    app = createServer()
    server = app.listen(0) // Use random port for testing
  })

  afterEach(async () => {
    if (server) {
      server.close()
    }
  })

  describe('GET /api/dashboard/metrics', () => {
    it('should return dashboard metrics', async () => {
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .expect(200)

      expect(response.body).toHaveProperty('totalDevices')
      expect(response.body).toHaveProperty('activeAlerts')
      expect(response.body).toHaveProperty('ticketsOpen')
      expect(response.body).toHaveProperty('systemHealth')
      expect(typeof response.body.totalDevices).toBe('number')
      expect(typeof response.body.activeAlerts).toBe('number')
      expect(typeof response.body.ticketsOpen).toBe('number')
      expect(typeof response.body.systemHealth).toBe('number')
    })

    it('should handle errors gracefully', async () => {
      // Mock database error
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .query({ forceError: true })

      // Should still return 200 with error handling
      expect(response.status).toBeLessThan(500)
    })
  })

  describe('GET /api/dashboard/performance', () => {
    it('should return performance data with date range', async () => {
      const response = await request(app)
        .get('/api/dashboard/performance')
        .query({
          from: '2024-01-01',
          to: '2024-01-31'
        })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('timestamp')
        expect(response.body[0]).toHaveProperty('cpu_usage')
        expect(response.body[0]).toHaveProperty('memory_usage')
      }
    })

    it('should validate date range parameters', async () => {
      const response = await request(app)
        .get('/api/dashboard/performance')
        .query({
          from: 'invalid-date',
          to: '2024-01-31'
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/dashboard/system-health', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/api/dashboard/system-health')
        .expect(200)

      expect(response.body).toHaveProperty('overall_health')
      expect(response.body).toHaveProperty('components')
      expect(Array.isArray(response.body.components)).toBe(true)
    })
  })
})
