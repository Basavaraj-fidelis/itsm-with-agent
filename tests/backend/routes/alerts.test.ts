
import request from 'supertest'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import { createServer } from '../../server/index'

describe('Alerts API', () => {
  let app: express.Application
  let server: any

  beforeEach(async () => {
    app = createServer()
    server = app.listen(0)
  })

  afterEach(async () => {
    if (server) {
      server.close()
    }
  })

  describe('GET /api/alerts', () => {
    it('should return list of alerts', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      if (response.body.length > 0) {
        const alert = response.body[0]
        expect(alert).toHaveProperty('id')
        expect(alert).toHaveProperty('device_id')
        expect(alert).toHaveProperty('alert_type')
        expect(alert).toHaveProperty('severity')
        expect(alert).toHaveProperty('is_active')
        expect(alert).toHaveProperty('triggered_at')
      }
    })

    it('should filter alerts by severity', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .query({ severity: 'critical' })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      response.body.forEach((alert: any) => {
        expect(alert.severity).toBe('critical')
      })
    })

    it('should filter alerts by status', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .query({ active: true })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      response.body.forEach((alert: any) => {
        expect(alert.is_active).toBe(true)
      })
    })

    it('should filter alerts by device', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .query({ device_id: 'test-device-id' })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      response.body.forEach((alert: any) => {
        expect(alert.device_id).toBe('test-device-id')
      })
    })
  })

  describe('POST /api/alerts', () => {
    it('should create a new alert', async () => {
      const alertData = {
        device_id: 'test-device-123',
        alert_type: 'high_cpu',
        severity: 'warning',
        message: 'CPU usage is above threshold',
        metadata: {
          cpu_usage: 85.5,
          threshold: 80
        }
      }

      const response = await request(app)
        .post('/api/alerts')
        .send(alertData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('device_id', alertData.device_id)
      expect(response.body).toHaveProperty('alert_type', alertData.alert_type)
      expect(response.body).toHaveProperty('severity', alertData.severity)
      expect(response.body).toHaveProperty('is_active', true)
      expect(response.body).toHaveProperty('triggered_at')
    })

    it('should validate required fields', async () => {
      const invalidAlertData = {
        alert_type: 'high_cpu'
        // Missing device_id and severity
      }

      const response = await request(app)
        .post('/api/alerts')
        .send(invalidAlertData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should validate severity values', async () => {
      const invalidAlertData = {
        device_id: 'test-device',
        alert_type: 'high_cpu',
        severity: 'invalid_severity'
      }

      const response = await request(app)
        .post('/api/alerts')
        .send(invalidAlertData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/alerts/:id', () => {
    it('should return specific alert details', async () => {
      // First create an alert
      const alertData = {
        device_id: 'test-device-details',
        alert_type: 'high_memory',
        severity: 'critical',
        message: 'Memory usage critical'
      }

      const createResponse = await request(app)
        .post('/api/alerts')
        .send(alertData)
        .expect(201)

      const alertId = createResponse.body.id

      const response = await request(app)
        .get(`/api/alerts/${alertId}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', alertId)
      expect(response.body).toHaveProperty('device_id', alertData.device_id)
      expect(response.body).toHaveProperty('alert_type', alertData.alert_type)
    })

    it('should return 404 for non-existent alert', async () => {
      const response = await request(app)
        .get('/api/alerts/non-existent-id')
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/alerts/:id/acknowledge', () => {
    it('should acknowledge an alert', async () => {
      // First create an alert
      const alertData = {
        device_id: 'test-device-ack',
        alert_type: 'disk_space',
        severity: 'warning',
        message: 'Low disk space'
      }

      const createResponse = await request(app)
        .post('/api/alerts')
        .send(alertData)
        .expect(201)

      const alertId = createResponse.body.id

      const response = await request(app)
        .post(`/api/alerts/${alertId}/acknowledge`)
        .send({ acknowledged_by: 'test_user' })
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('acknowledged')
    })
  })

  describe('POST /api/alerts/:id/resolve', () => {
    it('should resolve an alert', async () => {
      // First create an alert
      const alertData = {
        device_id: 'test-device-resolve',
        alert_type: 'service_down',
        severity: 'critical',
        message: 'Service is down'
      }

      const createResponse = await request(app)
        .post('/api/alerts')
        .send(alertData)
        .expect(201)

      const alertId = createResponse.body.id

      const response = await request(app)
        .post(`/api/alerts/${alertId}/resolve`)
        .send({ 
          resolved_by: 'test_user',
          resolution_notes: 'Service restarted successfully'
        })
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('resolved')
    })
  })

  describe('GET /api/alerts/stats', () => {
    it('should return alert statistics', async () => {
      const response = await request(app)
        .get('/api/alerts/stats')
        .expect(200)

      expect(response.body).toHaveProperty('total_alerts')
      expect(response.body).toHaveProperty('active_alerts')
      expect(response.body).toHaveProperty('alerts_by_severity')
      expect(response.body).toHaveProperty('alerts_by_type')
      expect(typeof response.body.total_alerts).toBe('number')
      expect(typeof response.body.active_alerts).toBe('number')
    })
  })
})
