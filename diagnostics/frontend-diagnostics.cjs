
const fs = require('fs');
const path = require('path');

class FrontendDiagnostics {
  constructor() {
    this.clientPath = path.join(process.cwd(), 'client', 'src');
    this.issues = [];
    this.warnings = [];
  }

  async diagnose() {
    console.log('🌐 Running Frontend Diagnostics...\n');

    this.checkStructure();
    this.checkImports();
    this.checkHooks();
    this.checkAPIConnections();
    this.checkErrorHandling();
    
    this.generateReport();
  }

  checkStructure() {
    console.log('📁 Checking project structure...');
    
    const requiredDirs = ['components', 'pages', 'hooks', 'lib'];
    const requiredFiles = ['App.tsx', 'main.tsx'];

    requiredDirs.forEach(dir => {
      const dirPath = path.join(this.clientPath, dir);
      if (!fs.existsSync(dirPath)) {
        this.issues.push(`Missing directory: ${dir}`);
      }
    });

    requiredFiles.forEach(file => {
      const filePath = path.join(this.clientPath, file);
      if (!fs.existsSync(filePath)) {
        this.issues.push(`Missing file: ${file}`);
      }
    });
  }

  checkImports() {
    console.log('📦 Checking imports...');
    
    const componentFiles = this.getAllTsxFiles();
    
    componentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const fileName = path.basename(file);

      // Check for React hooks without proper imports
      const hooksCheck = [
        { hook: 'useState', import: 'useState' },
        { hook: 'useEffect', import: 'useEffect' },
        { hook: 'useMemo', import: 'useMemo' },
        { hook: 'useCallback', import: 'useCallback' },
        { hook: 'useQuery', import: '@tanstack/react-query' },
        { hook: 'useToast', import: './use-toast' }
      ];

      hooksCheck.forEach(({ hook, import: importPath }) => {
        if (content.includes(hook) && !content.includes(importPath) && !content.includes('import React')) {
          this.issues.push(`${fileName}: ${hook} used without proper import`);
        }
      });

      // Check for undefined variables that might be imports
      const undefinedVars = this.extractUndefinedVariables(content);
      undefinedVars.forEach(variable => {
        this.warnings.push(`${fileName}: Potential undefined variable: ${variable}`);
      });
    });
  }

  checkHooks() {
    console.log('🎣 Checking React hooks usage...');
    
    const componentFiles = this.getAllTsxFiles();
    
    componentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const fileName = path.basename(file);

      // Check for hooks called conditionally
      const lines = content.split('\n');
      let inConditional = false;
      
      lines.forEach((line, index) => {
        if (line.includes('if (') || line.includes('if(')) {
          inConditional = true;
        }
        
        if (inConditional && (line.includes('useState') || line.includes('useEffect'))) {
          this.issues.push(`${fileName}:${index + 1}: Hook called conditionally`);
        }
        
        if (line.includes('}')) {
          inConditional = false;
        }
      });
    });
  }

  checkAPIConnections() {
    console.log('🔌 Checking API connections...');
    
    const apiFile = path.join(this.clientPath, 'lib', 'api.ts');
    if (fs.existsSync(apiFile)) {
      const content = fs.readFileSync(apiFile, 'utf8');
      
      // Check for hardcoded localhost
      if (content.includes('localhost') && !content.includes('0.0.0.0')) {
        this.warnings.push('API: Using localhost instead of 0.0.0.0');
      }

      // Check for missing error handling
      if (!content.includes('catch') && !content.includes('try')) {
        this.issues.push('API: Missing error handling');
      }
    } else {
      this.warnings.push('No API configuration file found');
    }
  }

  checkErrorHandling() {
    console.log('🛡️ Checking error handling...');
    
    const componentFiles = this.getAllTsxFiles();
    
    componentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const fileName = path.basename(file);

      // Check for fetch without error handling
      if (content.includes('fetch(') && !content.includes('.catch') && !content.includes('try')) {
        this.warnings.push(`${fileName}: Fetch without error handling`);
      }

      // Check for missing error boundaries
      if (content.includes('throw') && !content.includes('ErrorBoundary')) {
        this.warnings.push(`${fileName}: Components that throw should be wrapped in ErrorBoundary`);
      }
    });
  }

  getAllTsxFiles() {
    const files = [];
    
    function traverse(dir) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
          files.push(fullPath);
        }
      });
    }
    
    traverse(this.clientPath);
    return files;
  }

  extractUndefinedVariables(content) {
    // Simple regex to find potentially undefined variables
    const matches = content.match(/\b[A-Z][a-zA-Z0-9]*\b/g) || [];
    const definedVars = content.match(/(?:const|let|var|function|class|import.*)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g) || [];
    
    return matches.filter(match => 
      !definedVars.some(def => def.includes(match)) && 
      !['React', 'Component', 'Fragment'].includes(match)
    ).slice(0, 5); // Limit to avoid spam
  }

  generateReport() {
    console.log('\n📋 FRONTEND DIAGNOSTIC REPORT');
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
      console.log('\n✅ No issues found in frontend code!');
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`  Issues: ${this.issues.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);
  }
}

// Run if called directly
if (require.main === module) {
  const diagnostics = new FrontendDiagnostics();
  diagnostics.diagnose().catch(console.error);
}

module.exports = FrontendDiagnostics;
