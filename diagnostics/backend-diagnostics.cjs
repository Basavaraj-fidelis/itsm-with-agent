
const fs = require('fs');
const path = require('path');

class BackendDiagnostics {
  constructor() {
    this.serverPath = path.join(process.cwd(), 'server');
    this.issues = [];
    this.warnings = [];
  }

  async diagnose() {
    console.log('⚙️ Running Backend Diagnostics...\n');

    this.checkStructure();
    this.checkServerConfig();
    this.checkRoutes();
    this.checkMiddleware();
    this.checkDatabase();
    this.checkSecurity();
    
    this.generateReport();
  }

  checkStructure() {
    console.log('📁 Checking server structure...');
    
    const requiredDirs = ['routes', 'services', 'middleware', 'utils'];
    const requiredFiles = ['index.ts', 'routes.ts', 'storage.ts'];

    requiredDirs.forEach(dir => {
      const dirPath = path.join(this.serverPath, dir);
      if (!fs.existsSync(dirPath)) {
        this.warnings.push(`Missing directory: ${dir}`);
      }
    });

    requiredFiles.forEach(file => {
      const filePath = path.join(this.serverPath, file);
      if (!fs.existsSync(filePath)) {
        this.issues.push(`Missing file: ${file}`);
      }
    });
  }

  checkServerConfig() {
    console.log('🔧 Checking server configuration...');
    
    const indexFile = path.join(this.serverPath, 'index.ts');
    if (fs.existsSync(indexFile)) {
      const content = fs.readFileSync(indexFile, 'utf8');

      // Check for CORS configuration
      if (!content.includes('cors') && !content.includes('Access-Control-Allow-Origin')) {
        this.issues.push('CORS configuration missing');
      }

      // Check for proper port binding
      if (content.includes('localhost') && !content.includes('0.0.0.0')) {
        this.issues.push('Server bound to localhost instead of 0.0.0.0');
      }

      // Check for error handling
      if (!content.includes('process.on(\'unhandledRejection\'')) {
        this.warnings.push('Missing global error handling for unhandled rejections');
      }

      // Check for security headers
      if (!content.includes('helmet') && !content.includes('X-Frame-Options')) {
        this.warnings.push('Security headers may be missing');
      }

      // Check for WebSocket conflicts
      if (content.includes('expressWs') && content.includes('vite') && content.includes('hmr')) {
        this.issues.push('Potential WebSocket conflict between Express-WS and Vite HMR');
      }

      // Check for database connection
      if (!content.includes('DATABASE_URL')) {
        this.issues.push('Database connection configuration missing');
      }
    }
  }

  checkRoutes() {
    console.log('🛣️ Checking routes...');
    
    const routesDir = path.join(this.serverPath, 'routes');
    if (!fs.existsSync(routesDir)) {
      this.issues.push('Routes directory missing');
      return;
    }

    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));
    
    routeFiles.forEach(file => {
      const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
      const fileName = path.basename(file, '.ts');

      // Check for authentication middleware
      if (content.includes('app.get') || content.includes('app.post')) {
        if (!content.includes('authenticateToken') && !fileName.includes('auth') && !fileName.includes('public')) {
          this.warnings.push(`${file}: May be missing authentication middleware`);
        }
      }

      // Check for error handling
      if (!content.includes('try') || !content.includes('catch')) {
        this.warnings.push(`${file}: Missing error handling in routes`);
      }

      // Check for input validation
      if ((content.includes('req.body') || content.includes('req.params')) && !content.includes('validate')) {
        this.warnings.push(`${file}: Input validation may be missing`);
      }

      // Check for SQL injection protection
      if (content.includes('query') && content.includes('$')) {
        // Good - using parameterized queries
      } else if (content.includes('query') && content.includes('+')) {
        this.issues.push(`${file}: Potential SQL injection vulnerability`);
      }
    });
  }

  checkMiddleware() {
    console.log('🛡️ Checking middleware...');
    
    const middlewareDir = path.join(this.serverPath, 'middleware');
    if (!fs.existsSync(middlewareDir)) {
      this.warnings.push('Middleware directory missing');
      return;
    }

    const authMiddleware = path.join(middlewareDir, 'auth-middleware.ts');
    if (fs.existsSync(authMiddleware)) {
      const content = fs.readFileSync(authMiddleware, 'utf8');
      
      if (!content.includes('jwt')) {
        this.warnings.push('Authentication middleware may not be using JWT');
      }

      if (!content.includes('try') || !content.includes('catch')) {
        this.issues.push('Authentication middleware missing error handling');
      }
    } else {
      this.issues.push('Authentication middleware file missing');
    }
  }

  checkDatabase() {
    console.log('🗄️ Checking database configuration...');
    
    const dbFile = path.join(this.serverPath, 'db.ts');
    if (fs.existsSync(dbFile)) {
      const content = fs.readFileSync(dbFile, 'utf8');

      if (!content.includes('Pool') && !content.includes('Client')) {
        this.warnings.push('Database connection pool may not be configured');
      }

      if (!content.includes('ssl')) {
        this.warnings.push('SSL configuration for database may be missing');
      }
    }

    // Check migrations
    const migrationsDir = path.join(this.serverPath, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir);
      if (migrationFiles.length === 0) {
        this.warnings.push('No database migrations found');
      }
    } else {
      this.warnings.push('Migrations directory missing');
    }
  }

  checkSecurity() {
    console.log('🔒 Checking security...');
    
    const allFiles = this.getAllTsFiles();
    
    allFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const fileName = path.basename(file);

      // Check for hardcoded secrets
      const secretPatterns = [
        /password.*=.*["'][^"']{8,}["']/i,
        /api[_-]?key.*=.*["'][^"']{20,}["']/i,
        /secret.*=.*["'][^"']{16,}["']/i,
        /token.*=.*["'][^"']{20,}["']/i
      ];

      secretPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          this.issues.push(`${fileName}: Potential hardcoded secret detected`);
        }
      });

      // Check for eval usage
      if (content.includes('eval(')) {
        this.issues.push(`${fileName}: Dangerous eval() usage detected`);
      }

      // Check for unsafe file operations
      if (content.includes('fs.readFile') && !content.includes('path.join')) {
        this.warnings.push(`${fileName}: Potentially unsafe file operations`);
      }
    });
  }

  getAllTsFiles() {
    const files = [];
    
    function traverse(dir) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules')) {
          traverse(fullPath);
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      });
    }
    
    traverse(this.serverPath);
    return files;
  }

  generateReport() {
    console.log('\n📋 BACKEND DIAGNOSTIC REPORT');
    console.log('='.repeat(40));

    if (this.issues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES:');
      this.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ No issues found in backend code!');
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`  Issues: ${this.issues.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);
  }
}

// Run if called directly
if (require.main === module) {
  const diagnostics = new BackendDiagnostics();
  diagnostics.diagnose().catch(console.error);
}

module.exports = BackendDiagnostics;
