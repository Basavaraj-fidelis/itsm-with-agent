const fs = require('fs');
const path = require('path');

class APIDiagnostics {
  constructor() {
    this.baseUrl = 'http://127.0.0.1:5000';
    this.results = [];
    this.issues = [];
  }

  async diagnose() {
    console.log('🔌 Running API Diagnostics...\n');

    await this.testEndpoints();
    await this.checkCORS();
    await this.checkAuthentication();
    await this.checkRateLimit();
    await this.checkResponseTimes();

    this.generateReport();
  }

  async testEndpoints() {
    console.log('🎯 Testing API endpoints...');

    const endpoints = [
      { path: '/api/health', method: 'GET', auth: false, description: 'Health check' },
      { path: '/api/auth/login', method: 'POST', auth: false, description: 'Authentication' },
      { path: '/api/auth/verify', method: 'GET', auth: true, description: 'Token verification' },
      { path: '/api/tickets', method: 'GET', auth: true, description: 'Ticket listing' },
      { path: '/api/devices', method: 'GET', auth: true, description: 'Device listing' },
      { path: '/api/users', method: 'GET', auth: true, description: 'User listing' },
      { path: '/api/dashboard/summary', method: 'GET', auth: true, description: 'Dashboard data' },
      { path: '/api/analytics/tickets/metrics', method: 'GET', auth: true, description: 'Analytics' },
      { path: '/api/knowledge-base', method: 'GET', auth: false, description: 'Knowledge base' },
      { path: '/api/alerts', method: 'GET', auth: true, description: 'System alerts' }
    ];

    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint);
    }
  }

  async testEndpoint(endpoint) {
    const startTime = Date.now();

    try {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'ITSM-API-Diagnostics/1.0.0'
      };

      if (endpoint.auth) {
        headers['Authorization'] = 'Bearer test-token';
      }

      let body = null;
      if (endpoint.method === 'POST' && endpoint.path === '/api/auth/login') {
        body = JSON.stringify({
          email: 'admin@company.com',
          password: 'Admin123!'
        });
      }

      const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers,
        body,
        timeout: 10000
      });

      const responseTime = Date.now() - startTime;
      const contentType = response.headers.get('content-type');

      this.results.push({
        ...endpoint,
        status: response.status,
        ok: response.ok,
        responseTime,
        contentType,
        result: response.ok ? '✅' : '❌'
      });

      // Check for specific issues
      if (response.status === 404) {
        this.issues.push(`${endpoint.path}: Endpoint not found (404)`);
      } else if (response.status === 500) {
        this.issues.push(`${endpoint.path}: Server error (500)`);
      } else if (response.status === 401 && !endpoint.auth) {
        this.issues.push(`${endpoint.path}: Unexpected authentication required`);
      } else if (responseTime > 5000) {
        this.issues.push(`${endpoint.path}: Slow response time (${responseTime}ms)`);
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.results.push({
        ...endpoint,
        status: 'ERROR',
        error: error.message,
        responseTime,
        result: '❌'
      });

      if (error.message.includes('ECONNREFUSED')) {
        this.issues.push(`${endpoint.path}: Server not running or connection refused`);
      } else if (error.message.includes('timeout')) {
        this.issues.push(`${endpoint.path}: Request timeout`);
      } else {
        this.issues.push(`${endpoint.path}: ${error.message}`);
      }
    }
  }

  async checkCORS() {
    console.log('🌐 Checking CORS configuration...');

    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET'
        }
      });

      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
      };

      if (!corsHeaders['Access-Control-Allow-Origin']) {
        this.issues.push('CORS: Access-Control-Allow-Origin header missing');
      }

      if (!corsHeaders['Access-Control-Allow-Methods']) {
        this.issues.push('CORS: Access-Control-Allow-Methods header missing');
      }

    } catch (error) {
      this.issues.push(`CORS: Cannot test CORS configuration - ${error.message}`);
    }
  }

  async checkAuthentication() {
    console.log('🔐 Checking authentication...');

    // Test with no token
    try {
      const response = await fetch(`${this.baseUrl}/api/tickets`);
      if (response.status !== 401) {
        this.issues.push('Auth: Protected endpoint accessible without token');
      }
    } catch (error) {
      // Expected if server is down
    }

    // Test with invalid token
    try {
      const response = await fetch(`${this.baseUrl}/api/tickets`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      if (response.status !== 401 && response.status !== 403) {
        this.issues.push('Auth: Protected endpoint accepts invalid token');
      }
    } catch (error) {
      // Expected if server is down
    }
  }

  async checkRateLimit() {
    console.log('⏱️ Checking rate limiting...');

    // Make multiple rapid requests
    const rapidRequests = [];
    for (let i = 0; i < 10; i++) {
      rapidRequests.push(
        fetch(`${this.baseUrl}/api/health`).catch(() => null)
      );
    }

    try {
      const responses = await Promise.all(rapidRequests);
      const tooManyRequests = responses.filter(r => r && r.status === 429);

      if (tooManyRequests.length === 0) {
        // This might be okay for internal APIs, but worth noting
        console.log('  ⚠️ No rate limiting detected (may be intentional)');
      }
    } catch (error) {
      // Rate limiting test failed
    }
  }

  async checkResponseTimes() {
    console.log('⚡ Checking response times...');

    const healthChecks = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      try {
        await fetch(`${this.baseUrl}/api/health`);
        healthChecks.push(Date.now() - start);
      } catch (error) {
        healthChecks.push(10000); // Consider failed requests as slow
      }
    }

    const avgResponseTime = healthChecks.reduce((a, b) => a + b, 0) / healthChecks.length;

    if (avgResponseTime > 1000) {
      this.issues.push(`Performance: Average response time is high (${avgResponseTime.toFixed(0)}ms)`);
    }
  }

  generateReport() {
    console.log('\n📋 API DIAGNOSTIC REPORT');
    console.log('='.repeat(40));

    console.log('\n🎯 ENDPOINT TESTS:');
    this.results.forEach(result => {
      const time = result.responseTime ? `${result.responseTime}ms` : 'N/A';
      console.log(`  ${result.result} ${result.method} ${result.path} - ${result.status} (${time})`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });

    if (this.issues.length > 0) {
      console.log('\n❌ ISSUES FOUND:');
      this.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

    const successfulEndpoints = this.results.filter(r => r.result === '✅').length;
    const totalEndpoints = this.results.length;

    console.log(`\n📊 SUMMARY:`);
    console.log(`  Successful endpoints: ${successfulEndpoints}/${totalEndpoints}`);
    console.log(`  Issues found: ${this.issues.length}`);

    if (this.issues.length === 0 && successfulEndpoints === totalEndpoints) {
      console.log('\n✅ All API endpoints are functioning correctly!');
    } else if (successfulEndpoints === 0) {
      console.log('\n❌ Server appears to be down or unreachable');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const diagnostics = new APIDiagnostics();
  diagnostics.diagnose().catch(console.error);
}

module.exports = APIDiagnostics;