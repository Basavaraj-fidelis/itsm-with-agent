
import request from 'supertest'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import { createServer } from '../../server/index'

describe('Tickets API', () => {
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

  describe('GET /api/tickets', () => {
    it('should return list of tickets', async () => {
      const response = await request(app)
        .get('/api/tickets')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      if (response.body.length > 0) {
        const ticket = response.body[0]
        expect(ticket).toHaveProperty('id')
        expect(ticket).toHaveProperty('title')
        expect(ticket).toHaveProperty('description')
        expect(ticket).toHaveProperty('status')
        expect(ticket).toHaveProperty('priority')
        expect(ticket).toHaveProperty('created_at')
      }
    })

    it('should filter tickets by status', async () => {
      const response = await request(app)
        .get('/api/tickets')
        .query({ status: 'open' })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      response.body.forEach((ticket: any) => {
        expect(ticket.status).toBe('open')
      })
    })

    it('should filter tickets by priority', async () => {
      const response = await request(app)
        .get('/api/tickets')
        .query({ priority: 'high' })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      response.body.forEach((ticket: any) => {
        expect(ticket.priority).toBe('high')
      })
    })

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/tickets')
        .query({ page: 1, limit: 10 })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeLessThanOrEqual(10)
    })
  })

  describe('POST /api/tickets', () => {
    it('should create a new ticket', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        priority: 'medium',
        category: 'technical',
        assigned_to: 'admin'
      }

      const response = await request(app)
        .post('/api/tickets')
        .send(ticketData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('title', ticketData.title)
      expect(response.body).toHaveProperty('status', 'open')
      expect(response.body).toHaveProperty('created_at')
    })

    it('should validate required fields', async () => {
      const invalidTicketData = {
        description: 'Missing title'
      }

      const response = await request(app)
        .post('/api/tickets')
        .send(invalidTicketData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('title')
    })

    it('should validate priority values', async () => {
      const invalidTicketData = {
        title: 'Test Ticket',
        description: 'Test description',
        priority: 'invalid_priority'
      }

      const response = await request(app)
        .post('/api/tickets')
        .send(invalidTicketData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/tickets/:id', () => {
    it('should return specific ticket details', async () => {
      // First create a ticket
      const ticketData = {
        title: 'Test Ticket for Details',
        description: 'Test description',
        priority: 'medium'
      }

      const createResponse = await request(app)
        .post('/api/tickets')
        .send(ticketData)
        .expect(201)

      const ticketId = createResponse.body.id

      const response = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', ticketId)
      expect(response.body).toHaveProperty('title', ticketData.title)
      expect(response.body).toHaveProperty('comments')
      expect(Array.isArray(response.body.comments)).toBe(true)
    })

    it('should return 404 for non-existent ticket', async () => {
      const response = await request(app)
        .get('/api/tickets/non-existent-id')
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('PUT /api/tickets/:id', () => {
    it('should update ticket successfully', async () => {
      // First create a ticket
      const ticketData = {
        title: 'Test Ticket for Update',
        description: 'Test description',
        priority: 'medium'
      }

      const createResponse = await request(app)
        .post('/api/tickets')
        .send(ticketData)
        .expect(201)

      const ticketId = createResponse.body.id

      const updateData = {
        status: 'in_progress',
        priority: 'high'
      }

      const response = await request(app)
        .put(`/api/tickets/${ticketId}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('id', ticketId)
      expect(response.body).toHaveProperty('status', 'in_progress')
      expect(response.body).toHaveProperty('priority', 'high')
    })
  })

  describe('POST /api/tickets/:id/comments', () => {
    it('should add comment to ticket', async () => {
      // First create a ticket
      const ticketData = {
        title: 'Test Ticket for Comments',
        description: 'Test description',
        priority: 'medium'
      }

      const createResponse = await request(app)
        .post('/api/tickets')
        .send(ticketData)
        .expect(201)

      const ticketId = createResponse.body.id

      const commentData = {
        content: 'This is a test comment',
        author: 'test_user'
      }

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .send(commentData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('content', commentData.content)
      expect(response.body).toHaveProperty('author', commentData.author)
      expect(response.body).toHaveProperty('created_at')
    })
  })
})
