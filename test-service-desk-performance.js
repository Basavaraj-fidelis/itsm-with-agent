import { performance } from 'perf_hooks';
import request from 'supertest';
import { expect } from 'chai';
import app from './server/index.ts';

describe('Service Desk Performance Tests', () => {
  let authToken;

  before(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@company.com',
        password: 'admin123'
      });
    authToken = loginResponse.body.token;
  });

  describe('API Response Times', () => {
    it('should respond to ticket list requests within 2 seconds', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .get('/api/tickets?limit=50')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).to.equal(200);
      expect(responseTime).to.be.lessThan(2000);
      console.log(`Ticket list response time: ${responseTime.toFixed(2)}ms`);
    });

    it('should create tickets within 1 second', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'request',
          title: 'Performance Test Ticket',
          description: 'Testing response time',
          priority: 'medium',
          requester_email: 'perf@company.com',
          category: 'Testing'
        });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).to.equal(201);
      expect(responseTime).to.be.lessThan(1000);
      console.log(`Ticket creation response time: ${responseTime.toFixed(2)}ms`);
    });

    it('should handle dashboard queries efficiently', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).to.equal(200);
      expect(responseTime).to.be.lessThan(1500);
      console.log(`Dashboard response time: ${responseTime.toFixed(2)}ms`);
    });
  });

  describe('Load Testing', () => {
    it('should handle 10 concurrent ticket creations', async () => {
      const promises = [];
      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              type: 'request',
              title: `Load Test Ticket ${i}`,
              description: `Concurrent load testing ${i}`,
              priority: 'low',
              requester_email: `loadtest${i}@company.com`,
              category: 'Testing'
            })
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      responses.forEach(response => {
        expect(response.status).to.equal(201);
      });

      expect(totalTime).to.be.lessThan(5000);
      console.log(`10 concurrent tickets created in: ${totalTime.toFixed(2)}ms`);
    });

    it('should handle pagination efficiently with large datasets', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .get('/api/tickets?page=1&limit=100')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).to.equal(200);
      expect(responseTime).to.be.lessThan(3000);
      console.log(`Large pagination response time: ${responseTime.toFixed(2)}ms`);
    });
  });

  describe('Database Query Performance', () => {
    it('should filter tickets efficiently', async () => {
      const filters = [
        '?type=incident',
        '?priority=critical',
        '?status=open',
        '?search=server',
        '?type=incident&priority=high&status=assigned'
      ];

      for (const filter of filters) {
        const startTime = performance.now();

        const response = await request(app)
          .get(`/api/tickets${filter}`)
          .set('Authorization', `Bearer ${authToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        expect(response.status).to.equal(200);
        expect(responseTime).to.be.lessThan(2000);
        console.log(`Filter ${filter} response time: ${responseTime.toFixed(2)}ms`);
      }
    });

    it('should export large datasets within reasonable time', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .get('/api/tickets/export/csv')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).to.equal(200);
      expect(responseTime).to.be.lessThan(10000); // 10 seconds max for export
      console.log(`CSV export response time: ${responseTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should not have memory leaks during heavy operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform 50 operations
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .get('/api/tickets')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      await Promise.all(promises);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).to.be.lessThan(50 * 1024 * 1024);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid successive requests', async () => {
      const requests = 20;
      const delay = 50; // 50ms between requests
      const responses = [];

      for (let i = 0; i < requests; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/tickets?limit=10')
          .set('Authorization', `Bearer ${authToken}`);

        const endTime = performance.now();

        responses.push({
          status: response.status,
          time: endTime - startTime
        });

        if (i < requests - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // All requests should succeed
      responses.forEach(resp => {
        expect(resp.status).to.equal(200);
      });

      // Average response time should be reasonable
      const avgTime = responses.reduce((sum, resp) => sum + resp.time, 0) / responses.length;
      expect(avgTime).to.be.lessThan(1000);

      console.log(`Average response time over ${requests} requests: ${avgTime.toFixed(2)}ms`);
    });
  });
});