
import request from 'supertest'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import { createServer } from '../../../server/test-server'

describe('Users API', () => {
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

  describe('GET /api/users', () => {
    it('should return list of users', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      if (response.body.length > 0) {
        const user = response.body[0]
        expect(user).toHaveProperty('id')
        expect(user).toHaveProperty('username')
        expect(user).toHaveProperty('email')
        expect(user).toHaveProperty('role')
        expect(user).toHaveProperty('created_at')
        // Password should not be included
        expect(user).not.toHaveProperty('password')
      }
    })

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({ role: 'admin' })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      response.body.forEach((user: any) => {
        expect(user.role).toBe('admin')
      })
    })

    it('should search users by username', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({ search: 'test' })
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      // Should return users with 'test' in username or email
    })
  })

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const userData = {
        username: 'testuser123',
        email: 'testuser123@example.com',
        password: 'securepassword123',
        role: 'user',
        full_name: 'Test User'
      }

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('username', userData.username)
      expect(response.body).toHaveProperty('email', userData.email)
      expect(response.body).toHaveProperty('role', userData.role)
      expect(response.body).toHaveProperty('created_at')
      // Password should not be returned
      expect(response.body).not.toHaveProperty('password')
    })

    it('should validate required fields', async () => {
      const invalidUserData = {
        email: 'test@example.com'
        // Missing username and password
      }

      const response = await request(app)
        .post('/api/users')
        .send(invalidUserData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should validate email format', async () => {
      const invalidUserData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
        role: 'user'
      }

      const response = await request(app)
        .post('/api/users')
        .send(invalidUserData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('email')
    })

    it('should validate password strength', async () => {
      const invalidUserData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123', // Too weak
        role: 'user'
      }

      const response = await request(app)
        .post('/api/users')
        .send(invalidUserData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('password')
    })

    it('should prevent duplicate usernames', async () => {
      const userData = {
        username: 'duplicate_test',
        email: 'test1@example.com',
        password: 'password123',
        role: 'user'
      }

      // Create first user
      await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201)

      // Try to create user with same username
      const duplicateUserData = {
        ...userData,
        email: 'test2@example.com'
      }

      const response = await request(app)
        .post('/api/users')
        .send(duplicateUserData)
        .expect(409)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('username')
    })
  })

  describe('GET /api/users/:id', () => {
    it('should return specific user details', async () => {
      // First create a user
      const userData = {
        username: 'detailstest',
        email: 'details@example.com',
        password: 'password123',
        role: 'user'
      }

      const createResponse = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201)

      const userId = createResponse.body.id

      const response = await request(app)
        .get(`/api/users/${userId}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', userId)
      expect(response.body).toHaveProperty('username', userData.username)
      expect(response.body).toHaveProperty('email', userData.email)
      expect(response.body).not.toHaveProperty('password')
    })

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/non-existent-id')
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('PUT /api/users/:id', () => {
    it('should update user successfully', async () => {
      // First create a user
      const userData = {
        username: 'updatetest',
        email: 'update@example.com',
        password: 'password123',
        role: 'user'
      }

      const createResponse = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201)

      const userId = createResponse.body.id

      const updateData = {
        email: 'updated@example.com',
        role: 'admin'
      }

      const response = await request(app)
        .put(`/api/users/${userId}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('id', userId)
      expect(response.body).toHaveProperty('email', 'updated@example.com')
      expect(response.body).toHaveProperty('role', 'admin')
    })

    it('should validate email format on update', async () => {
      // Create a user first
      const userData = {
        username: 'emailupdatetest',
        email: 'emailupdate@example.com',
        password: 'password123',
        role: 'user'
      }

      const createResponse = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201)

      const userId = createResponse.body.id

      const updateData = {
        email: 'invalid-email-format'
      }

      const response = await request(app)
        .put(`/api/users/${userId}`)
        .send(updateData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('DELETE /api/users/:id', () => {
    it('should delete user successfully', async () => {
      // First create a user
      const userData = {
        username: 'deletetest',
        email: 'delete@example.com',
        password: 'password123',
        role: 'user'
      }

      const createResponse = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201)

      const userId = createResponse.body.id

      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .expect(200)

      expect(response.body).toHaveProperty('message')

      // Verify user is deleted
      await request(app)
        .get(`/api/users/${userId}`)
        .expect(404)
    })
  })
})
