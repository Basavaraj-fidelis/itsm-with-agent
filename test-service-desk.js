
import { expect } from 'chai';
import request from 'supertest';
import { app } from './server/index.js';

describe('Service Desk - Comprehensive Test Suite', () => {
  let authToken;
  let testTicketId;
  let testKBArticleId;
  let testUserId;

  // Setup - Login and get auth token
  before(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@company.com',
        password: 'admin123'
      });
    
    expect(loginResponse.status).to.equal(200);
    authToken = loginResponse.body.token;
  });

  describe('Authentication & User Management', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@company.com',
          password: 'admin123'
        });
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('token');
      expect(response.body).to.have.property('user');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@company.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).to.equal(401);
    });

    it('should verify token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('email');
    });

    it('should create new user account', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'testuser@company.com',
          password: 'testpass123',
          role: 'user',
          department: 'IT'
        });
      
      expect(response.status).to.equal(201);
      expect(response.body.user.email).to.equal('testuser@company.com');
    });

    it('should get all users (admin only)', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
    });
  });

  describe('Ticket Management - Core CRUD Operations', () => {
    it('should create a service request ticket', async () => {
      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'request',
          title: 'New Software Installation Request',
          description: 'Need Adobe Creative Suite installed on workstation',
          priority: 'medium',
          requester_email: 'user@company.com',
          category: 'Software Installation',
          impact: 'low',
          urgency: 'medium'
        });
      
      expect(response.status).to.equal(201);
      expect(response.body.type).to.equal('request');
      expect(response.body.ticket_number).to.match(/REQ-\d{4}-\d{3}/);
      testTicketId = response.body.id;
    });

    it('should create an incident ticket', async () => {
      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'incident',
          title: 'Server Outage - Production Database',
          description: 'Production database server is not responding',
          priority: 'critical',
          requester_email: 'admin@company.com',
          category: 'Server Issues',
          impact: 'critical',
          urgency: 'critical'
        });
      
      expect(response.status).to.equal(201);
      expect(response.body.type).to.equal('incident');
      expect(response.body.ticket_number).to.match(/INC-\d{4}-\d{3}/);
    });

    it('should create a problem ticket', async () => {
      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'problem',
          title: 'Recurring Application Crashes',
          description: 'Multiple users experiencing crashes in CRM application',
          priority: 'high',
          requester_email: 'support@company.com',
          category: 'Application Issues',
          impact: 'high',
          urgency: 'medium',
          root_cause: 'Memory leak in version 3.2.1',
          workaround: 'Restart application every 4 hours'
        });
      
      expect(response.status).to.equal(201);
      expect(response.body.type).to.equal('problem');
      expect(response.body.ticket_number).to.match(/PRO-\d{4}-\d{3}/);
    });

    it('should create a change request ticket', async () => {
      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'change',
          title: 'Server OS Upgrade',
          description: 'Upgrade production servers to latest OS version',
          priority: 'medium',
          requester_email: 'admin@company.com',
          category: 'System Upgrade',
          impact: 'high',
          urgency: 'low',
          change_type: 'normal',
          risk_level: 'medium',
          approval_status: 'pending',
          implementation_plan: '1. Backup data\n2. Schedule maintenance\n3. Perform upgrade',
          rollback_plan: 'Restore from backup if issues occur',
          scheduled_start: new Date('2024-03-01T02:00:00Z'),
          scheduled_end: new Date('2024-03-01T06:00:00Z')
        });
      
      expect(response.status).to.equal(201);
      expect(response.body.type).to.equal('change');
      expect(response.body.ticket_number).to.match(/CHA-\d{4}-\d{3}/);
    });

    it('should get all tickets with pagination', async () => {
      const response = await request(app)
        .get('/api/tickets?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('data');
      expect(response.body).to.have.property('total');
      expect(response.body).to.have.property('pages');
    });

    it('should get tickets filtered by type', async () => {
      const response = await request(app)
        .get('/api/tickets?type=incident')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      response.body.data.forEach(ticket => {
        expect(ticket.type).to.equal('incident');
      });
    });

    it('should get tickets filtered by status', async () => {
      const response = await request(app)
        .get('/api/tickets?status=new')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      response.body.data.forEach(ticket => {
        expect(ticket.status).to.equal('new');
      });
    });

    it('should get tickets filtered by priority', async () => {
      const response = await request(app)
        .get('/api/tickets?priority=critical')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      response.body.data.forEach(ticket => {
        expect(ticket.priority).to.equal('critical');
      });
    });

    it('should search tickets by title/description', async () => {
      const response = await request(app)
        .get('/api/tickets?search=server')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.data.length).to.be.greaterThan(0);
    });

    it('should get specific ticket by ID', async () => {
      const response = await request(app)
        .get(`/api/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.id).to.equal(testTicketId);
    });

    it('should update ticket status', async () => {
      const response = await request(app)
        .put(`/api/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'assigned',
          assigned_to: 'tech@company.com'
        });
      
      expect(response.status).to.equal(200);
      expect(response.body.status).to.equal('assigned');
      expect(response.body.assigned_to).to.equal('tech@company.com');
    });

    it('should update ticket priority', async () => {
      const response = await request(app)
        .put(`/api/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          priority: 'high'
        });
      
      expect(response.status).to.equal(200);
      expect(response.body.priority).to.equal('high');
    });
  });

  describe('Ticket Comments & Communication', () => {
    it('should add public comment to ticket', async () => {
      const response = await request(app)
        .post(`/api/tickets/${testTicketId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          comment: 'Started working on this request',
          author_email: 'tech@company.com',
          is_internal: false
        });
      
      expect(response.status).to.equal(201);
      expect(response.body.comment).to.equal('Started working on this request');
      expect(response.body.is_internal).to.equal(false);
    });

    it('should add internal comment to ticket', async () => {
      const response = await request(app)
        .post(`/api/tickets/${testTicketId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          comment: 'Internal note: Check with security team first',
          author_email: 'tech@company.com',
          is_internal: true
        });
      
      expect(response.status).to.equal(201);
      expect(response.body.is_internal).to.equal(true);
    });

    it('should get all comments for ticket', async () => {
      const response = await request(app)
        .get(`/api/tickets/${testTicketId}/comments`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
      expect(response.body.length).to.be.greaterThan(0);
    });
  });

  describe('Ticket Export & Reporting', () => {
    it('should export tickets as CSV', async () => {
      const response = await request(app)
        .get('/api/tickets/export/csv')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.headers['content-type']).to.include('text/csv');
      expect(response.headers['content-disposition']).to.include('attachment');
    });

    it('should export filtered tickets as CSV', async () => {
      const response = await request(app)
        .get('/api/tickets/export/csv?type=incident&priority=critical')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.headers['content-type']).to.include('text/csv');
    });
  });

  describe('Knowledge Base Management', () => {
    it('should create knowledge base article', async () => {
      const response = await request(app)
        .post('/api/knowledge-base')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'How to Reset Password',
          content: 'Step-by-step guide to reset user passwords...',
          category: 'User Management',
          tags: ['password', 'reset', 'user'],
          status: 'published'
        });
      
      expect(response.status).to.equal(201);
      expect(response.body.title).to.equal('How to Reset Password');
      testKBArticleId = response.body.id;
    });

    it('should get all knowledge base articles', async () => {
      const response = await request(app)
        .get('/api/knowledge-base')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
    });

    it('should get knowledge base article by ID', async () => {
      const response = await request(app)
        .get(`/api/knowledge-base/${testKBArticleId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.id).to.equal(testKBArticleId);
    });

    it('should update knowledge base article', async () => {
      const response = await request(app)
        .put(`/api/knowledge-base/${testKBArticleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'How to Reset Password - Updated',
          content: 'Updated step-by-step guide...'
        });
      
      expect(response.status).to.equal(200);
      expect(response.body.title).to.equal('How to Reset Password - Updated');
    });

    it('should search knowledge base articles', async () => {
      const response = await request(app)
        .get('/api/knowledge-base?search=password')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.length).to.be.greaterThan(0);
    });

    it('should filter knowledge base by category', async () => {
      const response = await request(app)
        .get('/api/knowledge-base?category=User Management')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      response.body.forEach(article => {
        expect(article.category).to.equal('User Management');
      });
    });
  });

  describe('Dashboard & Analytics', () => {
    it('should get dashboard summary', async () => {
      const response = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('total_tickets');
      expect(response.body).to.have.property('open_tickets');
      expect(response.body).to.have.property('resolved_tickets');
      expect(response.body).to.have.property('ticket_trends');
    });

    it('should validate dashboard metrics structure', async () => {
      const response = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.ticket_trends).to.be.an('array');
      expect(response.body).to.have.property('sla_performance');
      expect(response.body).to.have.property('priority_distribution');
    });
  });

  describe('Device & Agent Management', () => {
    it('should get all devices/agents', async () => {
      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
    });

    it('should get agents endpoint', async () => {
      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
    });
  });

  describe('Alert Management', () => {
    it('should get active alerts', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
    });
  });

  describe('SLA & Performance Tests', () => {
    it('should validate SLA response times', async () => {
      // Create high priority ticket and measure response
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'incident',
          title: 'Critical System Down',
          description: 'Primary server is down',
          priority: 'critical',
          requester_email: 'user@company.com',
          category: 'Server Issues',
          impact: 'critical',
          urgency: 'critical'
        });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).to.equal(201);
      expect(responseTime).to.be.lessThan(5000); // 5 second max response
    });

    it('should handle concurrent ticket creation', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              type: 'request',
              title: `Concurrent Test Ticket ${i}`,
              description: `Load test ticket number ${i}`,
              priority: 'medium',
              requester_email: 'loadtest@company.com',
              category: 'Testing'
            })
        );
      }
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).to.equal(201);
        expect(response.body.ticket_number).to.match(/REQ-\d{4}-\d{3}/);
      });
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle invalid ticket ID', async () => {
      const response = await request(app)
        .get('/api/tickets/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(404);
    });

    it('should validate required fields on ticket creation', async () => {
      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'request'
          // Missing required fields
        });
      
      expect(response.status).to.equal(400);
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/tickets')
        // No auth token
        
      expect(response.status).to.equal(401);
    });

    it('should validate ticket type enum', async () => {
      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'invalid_type',
          title: 'Test Ticket',
          description: 'Test Description',
          priority: 'medium',
          requester_email: 'user@company.com'
        });
      
      expect(response.status).to.equal(400);
    });

    it('should validate priority enum', async () => {
      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'request',
          title: 'Test Ticket',
          description: 'Test Description',
          priority: 'invalid_priority',
          requester_email: 'user@company.com'
        });
      
      expect(response.status).to.equal(400);
    });
  });

  describe('Workflow State Management', () => {
    it('should track ticket state transitions', async () => {
      // Create ticket
      const createResponse = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'incident',
          title: 'Workflow Test Ticket',
          description: 'Testing state transitions',
          priority: 'high',
          requester_email: 'user@company.com',
          category: 'Testing'
        });
      
      const ticketId = createResponse.body.id;
      
      // Test state progression: new -> assigned -> in_progress -> resolved
      const states = ['assigned', 'in_progress', 'resolved'];
      
      for (const state of states) {
        const response = await request(app)
          .put(`/api/tickets/${ticketId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: state });
        
        expect(response.status).to.equal(200);
        expect(response.body.status).to.equal(state);
      }
    });

    it('should handle change request approval workflow', async () => {
      // Create change request
      const createResponse = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'change',
          title: 'Test Change Request',
          description: 'Testing approval workflow',
          priority: 'medium',
          requester_email: 'user@company.com',
          category: 'System Change',
          change_type: 'normal',
          risk_level: 'low',
          approval_status: 'pending'
        });
      
      const ticketId = createResponse.body.id;
      
      // Approve change
      const approveResponse = await request(app)
        .put(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ approval_status: 'approved' });
      
      expect(approveResponse.status).to.equal(200);
      expect(approveResponse.body.approval_status).to.equal('approved');
    });
  });

  describe('Data Integrity & Validation', () => {
    it('should generate unique ticket numbers', async () => {
      const ticketNumbers = new Set();
      
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/tickets')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'request',
            title: `Unique Test ${i}`,
            description: 'Testing unique ticket numbers',
            priority: 'low',
            requester_email: 'user@company.com'
          });
        
        expect(response.status).to.equal(201);
        ticketNumbers.add(response.body.ticket_number);
      }
      
      expect(ticketNumbers.size).to.equal(3);
    });

    it('should validate email format in requester field', async () => {
      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'request',
          title: 'Email Validation Test',
          description: 'Testing email validation',
          priority: 'medium',
          requester_email: 'invalid-email-format'
        });
      
      expect(response.status).to.equal(400);
    });
  });

  // Cleanup
  after(async () => {
    // Delete test ticket
    if (testTicketId) {
      await request(app)
        .delete(`/api/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
    
    // Delete test KB article
    if (testKBArticleId) {
      await request(app)
        .delete(`/api/knowledge-base/${testKBArticleId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
  });
});
