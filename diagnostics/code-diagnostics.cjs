
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CodeDiagnostics {
  constructor() {
    this.results = {
      frontend: {},
      backend: {},
      api: {},
      database: {},
      overall: {}
    };
  }

  async runDiagnostics() {
    console.log('🔍 Starting Comprehensive Code Diagnostics...\n');

    try {
      await this.checkFrontend();
      await this.checkBackend();
      await this.checkAPI();
      await this.checkDatabase();
      await this.checkConnectivity();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
    }
  }

  async checkFrontend() {
    console.log('🌐 Checking Frontend...');
    
    // Check React components for common issues
    const clientSrc = path.join(process.cwd(), 'client', 'src');
    
    if (!fs.existsSync(clientSrc)) {
      this.results.frontend.structure = '❌ Client source directory missing';
      return;
    }

    // Check for common React issues
    const issues = [];
    let componentFiles = [];
    
    // Check for missing imports
    const componentsDir = path.join(clientSrc, 'components');
    if (fs.existsSync(componentsDir)) {
      componentFiles = this.getAllFiles(componentsDir, '.tsx');
      
      for (const file of componentFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for React hooks without imports
        if (content.includes('useState') && !content.includes('import { useState') && !content.includes('import React')) {
          issues.push(`${path.basename(file)}: useState used without import`);
        }
        
        if (content.includes('useEffect') && !content.includes('import { useEffect') && !content.includes('import React')) {
          issues.push(`${path.basename(file)}: useEffect used without import`);
        }

        if (content.includes('useMemo') && !content.includes('import { useMemo') && !content.includes('import React')) {
          issues.push(`${path.basename(file)}: useMemo used without import`);
        }

        if (content.includes('useQuery') && !content.includes('import { useQuery') && !content.includes('@tanstack/react-query')) {
          issues.push(`${path.basename(file)}: useQuery used without proper import`);
        }

        if (content.includes('useToast') && !content.includes('import { useToast') && !content.includes('./use-toast')) {
          issues.push(`${path.basename(file)}: useToast used without import`);
        }
      }
    }

    // Check main App.tsx
    const appFile = path.join(clientSrc, 'App.tsx');
    if (fs.existsSync(appFile)) {
      const appContent = fs.readFileSync(appFile, 'utf8');
      if (!appContent.includes('QueryClient') && appContent.includes('useQuery')) {
        issues.push('App.tsx: React Query provider may be missing');
      }
    }

    this.results.frontend = {
      structure: '✅ Frontend structure exists',
      issues: issues.length > 0 ? issues : ['✅ No obvious issues found'],
      components: componentFiles.length > 0 ? `Found ${componentFiles.length} component files` : 'No components found'
    };
  }

  async checkBackend() {
    console.log('⚙️ Checking Backend...');
    
    const serverDir = path.join(process.cwd(), 'server');
    
    if (!fs.existsSync(serverDir)) {
      this.results.backend.structure = '❌ Server directory missing';
      return;
    }

    const issues = [];

    // Check server/index.ts
    const indexFile = path.join(serverDir, 'index.ts');
    if (fs.existsSync(indexFile)) {
      const content = fs.readFileSync(indexFile, 'utf8');
      
      // Check for CORS configuration
      if (!content.includes('cors') && !content.includes('Access-Control-Allow-Origin')) {
        issues.push('CORS configuration may be missing');
      }

      // Check for error handling
      if (!content.includes('try') || !content.includes('catch')) {
        issues.push('Error handling may be insufficient');
      }

      // Check for database connection
      if (!content.includes('DATABASE_URL')) {
        issues.push('Database connection configuration missing');
      }

      // Check for WebSocket configuration issues
      if (content.includes('expressWs')) {
        // Check if HMR is properly disabled in vite config
        const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
        if (fs.existsSync(viteConfigPath)) {
          const viteContent = fs.readFileSync(viteConfigPath, 'utf8');
          if (!viteContent.includes('hmr: false') || !viteContent.includes('ws: false')) {
            issues.push('Potential WebSocket conflict with Vite HMR detected');
          }
        }
      }
    }

    // Check routes
    const routesDir = path.join(serverDir, 'routes');
    if (fs.existsSync(routesDir)) {
      const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));
      
      for (const file of routeFiles) {
        const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
        
        // Check for authentication middleware
        if (content.includes('/api/') && !content.includes('authenticateToken') && !file.includes('auth')) {
          issues.push(`${file}: May be missing authentication middleware`);
        }
      }
    }

    this.results.backend = {
      structure: '✅ Backend structure exists',
      issues: issues.length > 0 ? issues : ['✅ No obvious issues found'],
      routes: fs.existsSync(routesDir) ? `Found ${fs.readdirSync(routesDir).length} route files` : 'No routes directory'
    };
  }

  async checkAPI() {
    console.log('🔌 Checking API Endpoints...');
    
    const testEndpoints = [
      { path: '/api/health', method: 'GET', auth: false },
      { path: '/api/auth/verify', method: 'GET', auth: true },
      { path: '/api/tickets', method: 'GET', auth: true },
      { path: '/api/devices', method: 'GET', auth: true },
      { path: '/api/users', method: 'GET', auth: true }
    ];

    const results = [];
    const baseUrl = 'http://0.0.0.0:5000';

    for (const endpoint of testEndpoints) {
      try {
        const headers = {
          'Content-Type': 'application/json',
          'User-Agent': 'ITSM-Diagnostics/1.0.0'
        };

        if (endpoint.auth) {
          headers['Authorization'] = 'Bearer test-token';
        }

        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers,
          timeout: 5000
        });

        results.push({
          endpoint: endpoint.path,
          status: response.status,
          ok: response.ok,
          result: response.ok ? '✅' : '❌'
        });
      } catch (error) {
        results.push({
          endpoint: endpoint.path,
          status: 'ERROR',
          error: error.message,
          result: '❌'
        });
      }
    }

    this.results.api = {
      endpoints: results,
      summary: `${results.filter(r => r.result === '✅').length}/${results.length} endpoints responding`
    };
  }

  async checkDatabase() {
    console.log('🗄️ Checking Database...');
    
    try {
      // Check if DATABASE_URL is set
      const databaseUrl = process.env.DATABASE_URL;
      
      if (!databaseUrl) {
        this.results.database = {
          connection: '❌ DATABASE_URL not set',
          tables: 'Cannot check without connection'
        };
        return;
      }

      // Try to connect and check tables
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('aivencloud.com') ? { rejectUnauthorized: false } : false
      });

      const client = await pool.connect();
      
      // Check essential tables
      const tables = ['users', 'tickets', 'devices', 'knowledge_base'];
      const tableResults = [];

      for (const table of tables) {
        try {
          const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
          tableResults.push(`${table}: ${result.rows[0].count} records`);
        } catch (error) {
          tableResults.push(`${table}: ❌ ${error.message}`);
        }
      }

      client.release();
      await pool.end();

      this.results.database = {
        connection: '✅ Database connected',
        tables: tableResults
      };

    } catch (error) {
      this.results.database = {
        connection: `❌ Database error: ${error.message}`,
        tables: 'Cannot check tables'
      };
    }
  }

  async checkConnectivity() {
    console.log('🌐 Checking Connectivity...');
    
    const issues = [];

    // Check if server is running on correct port
    try {
      const response = await fetch('http://0.0.0.0:5000/api/health');
      if (response.ok) {
        issues.push('✅ Server responding on port 5000');
      } else {
        issues.push('❌ Server not responding correctly');
      }
    } catch (error) {
      issues.push('❌ Cannot connect to server on port 5000');
    }

    // Check Vite dev server
    try {
      const response = await fetch('http://0.0.0.0:5173');
      issues.push('✅ Vite dev server accessible');
    } catch (error) {
      issues.push('⚠️ Vite dev server may not be running');
    }

    this.results.overall.connectivity = issues;
  }

  getAllFiles(dir, extension) {
    const files = [];
    
    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (item.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    }
    
    traverse(dir);
    return files;
  }

  generateReport() {
    console.log('\n📋 DIAGNOSTIC REPORT');
    console.log('='.repeat(50));

    console.log('\n🌐 FRONTEND:');
    console.log(`Structure: ${this.results.frontend.structure}`);
    console.log(`Components: ${this.results.frontend.components}`);
    console.log('Issues:');
    this.results.frontend.issues.forEach(issue => console.log(`  - ${issue}`));

    console.log('\n⚙️ BACKEND:');
    console.log(`Structure: ${this.results.backend.structure}`);
    console.log(`Routes: ${this.results.backend.routes}`);
    console.log('Issues:');
    this.results.backend.issues.forEach(issue => console.log(`  - ${issue}`));

    console.log('\n🔌 API ENDPOINTS:');
    console.log(`Summary: ${this.results.api.summary}`);
    this.results.api.endpoints.forEach(ep => {
      console.log(`  ${ep.result} ${ep.endpoint} - ${ep.status} ${ep.error || ''}`);
    });

    console.log('\n🗄️ DATABASE:');
    console.log(`Connection: ${this.results.database.connection}`);
    if (Array.isArray(this.results.database.tables)) {
      console.log('Tables:');
      this.results.database.tables.forEach(table => console.log(`  - ${table}`));
    }

    console.log('\n🌐 CONNECTIVITY:');
    this.results.overall.connectivity.forEach(item => console.log(`  ${item}`));

    console.log('\n🎯 RECOMMENDATIONS:');
    this.generateRecommendations();
  }

  generateRecommendations() {
    const recommendations = [];

    // Frontend recommendations
    if (this.results.frontend.issues.some(issue => issue.includes('import'))) {
      recommendations.push('Fix missing imports in React components');
    }

    // Backend recommendations
    if (this.results.backend.issues.some(issue => issue.includes('CORS'))) {
      recommendations.push('Configure CORS properly for cross-origin requests');
    }

    // API recommendations
    const failedEndpoints = this.results.api.endpoints.filter(ep => ep.result === '❌');
    if (failedEndpoints.length > 0) {
      recommendations.push(`Fix ${failedEndpoints.length} failing API endpoints`);
    }

    // Database recommendations
    if (this.results.database.connection.includes('❌')) {
      recommendations.push('Fix database connection issues');
    }

    // Connectivity recommendations
    if (this.results.overall.connectivity.some(item => item.includes('❌'))) {
      recommendations.push('Resolve server connectivity issues');
    }

    if (recommendations.length === 0) {
      console.log('  ✅ No major issues detected!');
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
  }
}

// Run diagnostics
const diagnostics = new CodeDiagnostics();
diagnostics.runDiagnostics().catch(console.error);

module.exports = CodeDiagnostics;
