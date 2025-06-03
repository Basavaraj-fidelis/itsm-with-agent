
import request from 'supertest'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import { createServer } from '../../server/index'

describe('Knowledge Base API', () => {
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

  describe('GET /api/knowledge', () => {
    it('should return list of articles', async () => {
      const response = await request(app)
        .get('/api/knowledge')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      if (response.body.length > 0) {
        const article = response.body[0]
        expect(article).toHaveProperty('id')
        expect(article).toHaveProperty('title')
        expect(article).toHaveProperty('content')
        expect(article).toHaveProperty('category')
        expect(article).toHaveProperty('status')
        expect(article).toHaveProperty('created_at')
      }
    })

    it('should filter articles by category', async () => {
      const response = await request(app)
        .get('/api/knowledge')
        .query({ category: 'troubleshooting' })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      response.body.forEach((article: any) => {
        expect(article.category.toLowerCase()).toBe('troubleshooting')
      })
    })

    it('should search articles by title and content', async () => {
      const response = await request(app)
        .get('/api/knowledge')
        .query({ search: 'test' })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      // Should return articles containing 'test' in title or content
    })

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/knowledge')
        .query({ status: 'published' })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      response.body.forEach((article: any) => {
        expect(article.status).toBe('published')
      })
    })
  })

  describe('POST /api/knowledge', () => {
    it('should create a new article', async () => {
      const articleData = {
        title: 'Test Knowledge Article',
        content: 'This is test content for the knowledge base article.',
        category: 'general',
        tags: ['test', 'documentation'],
        author_email: 'test@example.com'
      }

      const response = await request(app)
        .post('/api/knowledge')
        .send(articleData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('title', articleData.title)
      expect(response.body).toHaveProperty('content', articleData.content)
      expect(response.body).toHaveProperty('status', 'draft')
      expect(response.body).toHaveProperty('created_at')
    })

    it('should validate required fields', async () => {
      const invalidArticleData = {
        content: 'Missing title'
      }

      const response = await request(app)
        .post('/api/knowledge')
        .send(invalidArticleData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('title')
    })

    it('should validate category values', async () => {
      const invalidArticleData = {
        title: 'Test Article',
        content: 'Test content',
        category: 'invalid_category'
      }

      const response = await request(app)
        .post('/api/knowledge')
        .send(invalidArticleData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/knowledge/:id', () => {
    it('should return specific article details', async () => {
      // First create an article
      const articleData = {
        title: 'Test Article for Details',
        content: 'Test content',
        category: 'general'
      }

      const createResponse = await request(app)
        .post('/api/knowledge')
        .send(articleData)
        .expect(201)

      const articleId = createResponse.body.id

      const response = await request(app)
        .get(`/api/knowledge/${articleId}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', articleId)
      expect(response.body).toHaveProperty('title', articleData.title)
      expect(response.body).toHaveProperty('views')
      expect(response.body).toHaveProperty('helpful_votes')
    })

    it('should increment view count', async () => {
      // Create an article
      const articleData = {
        title: 'Test Article for Views',
        content: 'Test content',
        category: 'general'
      }

      const createResponse = await request(app)
        .post('/api/knowledge')
        .send(articleData)
        .expect(201)

      const articleId = createResponse.body.id
      const initialViews = createResponse.body.views || 0

      // View the article
      await request(app)
        .get(`/api/knowledge/${articleId}`)
        .expect(200)

      // Check if views incremented
      const response = await request(app)
        .get(`/api/knowledge/${articleId}`)
        .expect(200)

      expect(response.body.views).toBeGreaterThan(initialViews)
    })

    it('should return 404 for non-existent article', async () => {
      const response = await request(app)
        .get('/api/knowledge/non-existent-id')
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('PUT /api/knowledge/:id', () => {
    it('should update article successfully', async () => {
      // First create an article
      const articleData = {
        title: 'Test Article for Update',
        content: 'Test content',
        category: 'general'
      }

      const createResponse = await request(app)
        .post('/api/knowledge')
        .send(articleData)
        .expect(201)

      const articleId = createResponse.body.id

      const updateData = {
        title: 'Updated Test Article',
        status: 'published'
      }

      const response = await request(app)
        .put(`/api/knowledge/${articleId}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('id', articleId)
      expect(response.body).toHaveProperty('title', 'Updated Test Article')
      expect(response.body).toHaveProperty('status', 'published')
    })
  })

  describe('POST /api/knowledge/:id/vote', () => {
    it('should record helpful vote', async () => {
      // Create an article
      const articleData = {
        title: 'Test Article for Voting',
        content: 'Test content',
        category: 'general'
      }

      const createResponse = await request(app)
        .post('/api/knowledge')
        .send(articleData)
        .expect(201)

      const articleId = createResponse.body.id

      const response = await request(app)
        .post(`/api/knowledge/${articleId}/vote`)
        .send({ helpful: true })
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('vote recorded')
    })
  })
})
