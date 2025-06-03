
import request from 'supertest'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import { createServer } from '../../server/index'

describe('Agents API', () => {
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

  describe('GET /api/agents', () => {
    it('should return list of agents', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      if (response.body.length > 0) {
        const agent = response.body[0]
        expect(agent).toHaveProperty('id')
        expect(agent).toHaveProperty('hostname')
        expect(agent).toHaveProperty('ip_address')
        expect(agent).toHaveProperty('status')
        expect(agent).toHaveProperty('last_seen')
      }
    })

    it('should filter agents by status', async () => {
      const response = await request(app)
        .get('/api/agents')
        .query({ status: 'online' })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      response.body.forEach((agent: any) => {
        expect(agent.status).toBe('online')
      })
    })

    it('should filter agents by OS type', async () => {
      const response = await request(app)
        .get('/api/agents')
        .query({ os_type: 'Windows' })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      response.body.forEach((agent: any) => {
        expect(agent.os_type).toBe('Windows')
      })
    })
  })

  describe('GET /api/agents/:id', () => {
    it('should return specific agent details', async () => {
      // First get list of agents to get a valid ID
      const agentsResponse = await request(app)
        .get('/api/agents')
        .expect(200)

      if (agentsResponse.body.length > 0) {
        const agentId = agentsResponse.body[0].id

        const response = await request(app)
          .get(`/api/agents/${agentId}`)
          .expect(200)

        expect(response.body).toHaveProperty('id', agentId)
        expect(response.body).toHaveProperty('hostname')
        expect(response.body).toHaveProperty('system_info')
        expect(response.body).toHaveProperty('metrics')
      }
    })

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .get('/api/agents/non-existent-id')
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/agents/:id/actions', () => {
    it('should execute agent action successfully', async () => {
      const agentsResponse = await request(app)
        .get('/api/agents')
        .expect(200)

      if (agentsResponse.body.length > 0) {
        const agentId = agentsResponse.body[0].id

        const response = await request(app)
          .post(`/api/agents/${agentId}/actions`)
          .send({
            action: 'restart_service',
            parameters: { service_name: 'test-service' }
          })
          .expect(200)

        expect(response.body).toHaveProperty('success', true)
        expect(response.body).toHaveProperty('message')
      }
    })

    it('should validate action parameters', async () => {
      const agentsResponse = await request(app)
        .get('/api/agents')
        .expect(200)

      if (agentsResponse.body.length > 0) {
        const agentId = agentsResponse.body[0].id

        const response = await request(app)
          .post(`/api/agents/${agentId}/actions`)
          .send({
            action: 'invalid_action'
          })
          .expect(400)

        expect(response.body).toHaveProperty('error')
      }
    })
  })

  describe('POST /api/report', () => {
    it('should accept agent reports', async () => {
      const reportData = {
        hostname: 'test-agent',
        ip_address: '192.168.1.100',
        os_type: 'Windows',
        system: {
          cpu_count: 4,
          memory_total: 8589934592
        },
        metrics: {
          cpu_usage: 25.5,
          memory_usage: 65.2,
          disk_usage: 45.8
        }
      }

      const response = await request(app)
        .post('/api/report')
        .send(reportData)
        .expect(200)

      expect(response.body).toHaveProperty('message')
    })

    it('should validate report data structure', async () => {
      const invalidReportData = {
        hostname: 'test-agent'
        // Missing required fields
      }

      const response = await request(app)
        .post('/api/report')
        .send(invalidReportData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })
})
