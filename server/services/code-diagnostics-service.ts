
import { promises as fs } from 'fs';
import { join, extname, relative } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DiagnosticIssue {
  severity: 'error' | 'warning' | 'info';
  type: string;
  message: string;
  file: string;
  line?: number;
  column?: number;
  rule?: string;
  suggestion?: string;
}

interface FileDiagnostics {
  file: string;
  size: number;
  lines: number;
  language: string;
  complexity: number;
  issues: DiagnosticIssue[];
  metrics: {
    cyclomaticComplexity?: number;
    maintainabilityIndex?: number;
    duplicateLines?: number;
    testCoverage?: number;
  };
}

interface ProjectDiagnostics {
  overview: {
    totalFiles: number;
    totalLines: number;
    totalSize: number;
    languages: Record<string, number>;
    issueCount: {
      errors: number;
      warnings: number;
      info: number;
    };
  };
  files: FileDiagnostics[];
  recommendations: string[];
  securityIssues: DiagnosticIssue[];
  performanceIssues: DiagnosticIssue[];
  qualityMetrics: {
    averageComplexity: number;
    maintainabilityScore: number;
    testCoveragePercentage: number;
    duplicateCodePercentage: number;
  };
}

export class CodeDiagnosticsService {
  private readonly rootPath: string;
  private readonly excludePaths = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '.replit',
    'attached_assets'
  ];

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
  }

  async runComprehensiveDiagnostics(): Promise<ProjectDiagnostics> {
    console.log('🔍 Starting comprehensive code diagnostics...');

    const files = await this.getAllProjectFiles();
    const fileDiagnostics: FileDiagnostics[] = [];
    
    let totalLines = 0;
    let totalSize = 0;
    const languages: Record<string, number> = {};
    const allIssues: DiagnosticIssue[] = [];

    // Analyze each file
    for (const file of files) {
      try {
        const diagnostics = await this.analyzeFile(file);
        fileDiagnostics.push(diagnostics);
        
        totalLines += diagnostics.lines;
        totalSize += diagnostics.size;
        languages[diagnostics.language] = (languages[diagnostics.language] || 0) + 1;
        allIssues.push(...diagnostics.issues);
      } catch (error) {
        console.warn(`Failed to analyze ${file}:`, error.message);
      }
    }

    // Calculate issue counts
    const issueCount = {
      errors: allIssues.filter(i => i.severity === 'error').length,
      warnings: allIssues.filter(i => i.severity === 'warning').length,
      info: allIssues.filter(i => i.severity === 'info').length
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(fileDiagnostics, allIssues);
    
    // Extract security and performance issues
    const securityIssues = allIssues.filter(i => i.type.includes('security'));
    const performanceIssues = allIssues.filter(i => i.type.includes('performance'));

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(fileDiagnostics);

    return {
      overview: {
        totalFiles: files.length,
        totalLines,
        totalSize,
        languages,
        issueCount
      },
      files: fileDiagnostics,
      recommendations,
      securityIssues,
      performanceIssues,
      qualityMetrics
    };
  }

  private async getAllProjectFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          const relativePath = relative(this.rootPath, fullPath);
          
          // Skip excluded paths
          if (this.excludePaths.some(excluded => relativePath.startsWith(excluded))) {
            continue;
          }
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile()) {
            const ext = extname(entry.name);
            // Only analyze code files
            if (this.isCodeFile(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${dir}:`, error.message);
      }
    };

    await scanDirectory(this.rootPath);
    return files;
  }

  private isCodeFile(extension: string): boolean {
    const codeExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.py', '.sql', '.json', '.md',
      '.css', '.scss', '.html', '.vue', '.go', '.java', '.c', '.cpp',
      '.h', '.hpp', '.cs', '.php', '.rb', '.rs', '.sh', '.yaml', '.yml'
    ];
    return codeExtensions.includes(extension.toLowerCase());
  }

  private async analyzeFile(filePath: string): Promise<FileDiagnostics> {
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    const extension = extname(filePath);
    const language = this.getLanguageFromExtension(extension);
    const lines = content.split('\n').length;
    
    const issues: DiagnosticIssue[] = [];
    let complexity = 0;

    // Basic file analysis
    if (stats.size > 10 * 1024 * 1024) { // 10MB
      issues.push({
        severity: 'warning',
        type: 'file-size',
        message: 'File is very large (>10MB)',
        file: filePath,
        suggestion: 'Consider splitting this file into smaller modules'
      });
    }

    if (lines > 1000) {
      issues.push({
        severity: 'warning',
        type: 'file-length',
        message: `File has ${lines} lines`,
        file: filePath,
        suggestion: 'Consider breaking this file into smaller components'
      });
    }

    // Language-specific analysis
    switch (language) {
      case 'typescript':
      case 'javascript':
        issues.push(...await this.analyzeJavaScriptTypeScript(content, filePath));
        complexity = this.calculateJSComplexity(content);
        break;
      case 'python':
        issues.push(...await this.analyzePython(content, filePath));
        complexity = this.calculatePythonComplexity(content);
        break;
      case 'sql':
        issues.push(...this.analyzeSQL(content, filePath));
        break;
      case 'json':
        issues.push(...this.analyzeJSON(content, filePath));
        break;
    }

    // Security analysis
    issues.push(...this.analyzeSecurityIssues(content, filePath, language));

    // Performance analysis
    issues.push(...this.analyzePerformanceIssues(content, filePath, language));

    return {
      file: relative(this.rootPath, filePath),
      size: stats.size,
      lines,
      language,
      complexity,
      issues,
      metrics: {
        cyclomaticComplexity: complexity,
        maintainabilityIndex: this.calculateMaintainabilityIndex(content, complexity),
        duplicateLines: this.findDuplicateLines(content),
        testCoverage: this.estimateTestCoverage(content, filePath)
      }
    };
  }

  private async analyzeJavaScriptTypeScript(content: string, filePath: string): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];
    const lines = content.split('\n');

    // Check for common issues
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Console.log statements
      if (line.includes('console.log') && !line.includes('//')) {
        issues.push({
          severity: 'warning',
          type: 'debug-code',
          message: 'Console.log statement found',
          file: filePath,
          line: lineNum,
          suggestion: 'Remove debug console.log statements in production'
        });
      }

      // TODO comments
      if (line.includes('TODO') || line.includes('FIXME')) {
        issues.push({
          severity: 'info',
          type: 'todo',
          message: 'TODO/FIXME comment found',
          file: filePath,
          line: lineNum,
          suggestion: 'Address TODO/FIXME comments'
        });
      }

      // Long lines
      if (line.length > 120) {
        issues.push({
          severity: 'warning',
          type: 'line-length',
          message: `Line exceeds 120 characters (${line.length})`,
          file: filePath,
          line: lineNum,
          suggestion: 'Break long lines for better readability'
        });
      }

      // Unused imports (basic check)
      if (line.trim().startsWith('import') && line.includes('{') && !line.includes('*')) {
        const importMatch = line.match(/import\s*{([^}]+)}/);
        if (importMatch) {
          const imports = importMatch[1].split(',').map(i => i.trim());
          imports.forEach(imp => {
            if (!content.includes(imp.replace(/\s+as\s+\w+/, ''))) {
              issues.push({
                severity: 'warning',
                type: 'unused-import',
                message: `Possibly unused import: ${imp}`,
                file: filePath,
                line: lineNum,
                suggestion: 'Remove unused imports'
              });
            }
          });
        }
      }

      // Missing error handling
      if (line.includes('await ') && !content.includes('try') && !content.includes('catch')) {
        issues.push({
          severity: 'warning',
          type: 'error-handling',
          message: 'Async operation without error handling',
          file: filePath,
          line: lineNum,
          suggestion: 'Add try-catch blocks for async operations'
        });
      }
    });

    // Check for TypeScript specific issues
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      if (content.includes('any') && !content.includes('// @ts-ignore')) {
        const anyMatches = content.match(/:\s*any/g);
        if (anyMatches) {
          issues.push({
            severity: 'warning',
            type: 'typescript',
            message: `Found ${anyMatches.length} 'any' type usage(s)`,
            file: filePath,
            suggestion: 'Replace any types with specific types'
          });
        }
      }
    }

    return issues;
  }

  private async analyzePython(content: string, filePath: string): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Print statements
      if (line.includes('print(') && !line.trim().startsWith('#')) {
        issues.push({
          severity: 'warning',
          type: 'debug-code',
          message: 'Print statement found',
          file: filePath,
          line: lineNum,
          suggestion: 'Use logging instead of print statements'
        });
      }

      // Long lines
      if (line.length > 79) {
        issues.push({
          severity: 'warning',
          type: 'line-length',
          message: `Line exceeds 79 characters (${line.length})`,
          file: filePath,
          line: lineNum,
          suggestion: 'Follow PEP 8 line length guidelines'
        });
      }

      // Missing type hints
      if (line.trim().startsWith('def ') && !line.includes('->') && !line.includes('__init__')) {
        issues.push({
          severity: 'info',
          type: 'type-hints',
          message: 'Function missing type hints',
          file: filePath,
          line: lineNum,
          suggestion: 'Add type hints for better code documentation'
        });
      }
    });

    return issues;
  }

  private analyzeSQL(content: string, filePath: string): DiagnosticIssue[] {
    const issues: DiagnosticIssue[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const upperLine = line.toUpperCase();
      
      // Check for SELECT *
      if (upperLine.includes('SELECT *')) {
        issues.push({
          severity: 'warning',
          type: 'sql-performance',
          message: 'SELECT * usage found',
          file: filePath,
          line: lineNum,
          suggestion: 'Specify column names instead of using SELECT *'
        });
      }

      // Missing WHERE clause in UPDATE/DELETE
      if ((upperLine.includes('UPDATE ') || upperLine.includes('DELETE ')) && 
          !upperLine.includes('WHERE')) {
        issues.push({
          severity: 'error',
          type: 'sql-safety',
          message: 'UPDATE/DELETE without WHERE clause',
          file: filePath,
          line: lineNum,
          suggestion: 'Always include WHERE clause in UPDATE/DELETE statements'
        });
      }
    });

    return issues;
  }

  private analyzeJSON(content: string, filePath: string): DiagnosticIssue[] {
    const issues: DiagnosticIssue[] = [];

    try {
      JSON.parse(content);
    } catch (error) {
      issues.push({
        severity: 'error',
        type: 'json-syntax',
        message: 'Invalid JSON syntax',
        file: filePath,
        suggestion: 'Fix JSON syntax errors'
      });
    }

    return issues;
  }

  private analyzeSecurityIssues(content: string, filePath: string, language: string): DiagnosticIssue[] {
    const issues: DiagnosticIssue[] = [];

    // Check for hardcoded secrets
    const secretPatterns = [
      { pattern: /password\s*=\s*["'][^"']{3,}["']/i, message: 'Hardcoded password detected' },
      { pattern: /api[_-]?key\s*=\s*["'][^"']{10,}["']/i, message: 'Hardcoded API key detected' },
      { pattern: /secret\s*=\s*["'][^"']{10,}["']/i, message: 'Hardcoded secret detected' },
      { pattern: /token\s*=\s*["'][^"']{20,}["']/i, message: 'Hardcoded token detected' },
    ];

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      secretPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(line) && !line.includes('process.env') && !line.includes('TODO')) {
          issues.push({
            severity: 'error',
            type: 'security-secret',
            message,
            file: filePath,
            line: index + 1,
            suggestion: 'Move secrets to environment variables'
          });
        }
      });

      // SQL Injection risks
      if (language === 'javascript' || language === 'typescript') {
        if (line.includes('query(') && line.includes('${') && !line.includes('$1')) {
          issues.push({
            severity: 'error',
            type: 'security-sql-injection',
            message: 'Potential SQL injection vulnerability',
            file: filePath,
            line: index + 1,
            suggestion: 'Use parameterized queries instead of string interpolation'
          });
        }
      }
    });

    return issues;
  }

  private analyzePerformanceIssues(content: string, filePath: string, language: string): DiagnosticIssue[] {
    const issues: DiagnosticIssue[] = [];

    if (language === 'javascript' || language === 'typescript') {
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Synchronous file operations
        if (line.includes('fs.readFileSync') || line.includes('fs.writeFileSync')) {
          issues.push({
            severity: 'warning',
            type: 'performance-sync-io',
            message: 'Synchronous file operation detected',
            file: filePath,
            line: index + 1,
            suggestion: 'Use asynchronous file operations for better performance'
          });
        }

        // Inefficient loops
        if (line.includes('for') && line.includes('.length') && content.includes('push(')) {
          issues.push({
            severity: 'info',
            type: 'performance-loop',
            message: 'Potentially inefficient loop pattern',
            file: filePath,
            line: index + 1,
            suggestion: 'Consider using map, filter, or reduce methods'
          });
        }
      });
    }

    return issues;
  }

  private calculateJSComplexity(content: string): number {
    const complexityKeywords = [
      'if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try', '&&', '||', '?'
    ];
    
    let complexity = 1; // Base complexity
    complexityKeywords.forEach(keyword => {
      const matches = content.match(new RegExp(keyword, 'g'));
      if (matches) {
        complexity += matches.length;
      }
    });
    
    return complexity;
  }

  private calculatePythonComplexity(content: string): number {
    const complexityKeywords = [
      'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'and', 'or'
    ];
    
    let complexity = 1;
    complexityKeywords.forEach(keyword => {
      const matches = content.match(new RegExp(`\\b${keyword}\\b`, 'g'));
      if (matches) {
        complexity += matches.length;
      }
    });
    
    return complexity;
  }

  private calculateMaintainabilityIndex(content: string, complexity: number): number {
    const lines = content.split('\n').length;
    const halsteadVolume = Math.log2(content.length);
    
    // Simplified maintainability index calculation
    const mi = Math.max(0, 
      171 - 5.2 * Math.log(halsteadVolume) - 0.23 * complexity - 16.2 * Math.log(lines)
    );
    
    return Math.round(mi);
  }

  private findDuplicateLines(content: string): number {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 5);
    const lineCount = new Map<string, number>();
    
    lines.forEach(line => {
      lineCount.set(line, (lineCount.get(line) || 0) + 1);
    });
    
    let duplicates = 0;
    lineCount.forEach(count => {
      if (count > 1) {
        duplicates += count - 1;
      }
    });
    
    return duplicates;
  }

  private estimateTestCoverage(content: string, filePath: string): number {
    // Basic heuristic for test coverage estimation
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      return 100; // Test files have 100% coverage
    }
    
    const testPatterns = ['describe(', 'it(', 'test(', 'expect('];
    const hasTests = testPatterns.some(pattern => content.includes(pattern));
    
    if (hasTests) {
      return 80; // Files with tests get higher coverage estimate
    }
    
    return 20; // Default low coverage for files without tests
  }

  private generateRecommendations(files: FileDiagnostics[], issues: DiagnosticIssue[]): string[] {
    const recommendations: string[] = [];
    
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    
    if (errorCount > 0) {
      recommendations.push(`Fix ${errorCount} critical error(s) immediately`);
    }
    
    if (warningCount > 10) {
      recommendations.push(`Address ${warningCount} warning(s) to improve code quality`);
    }
    
    const largeFiles = files.filter(f => f.lines > 500);
    if (largeFiles.length > 0) {
      recommendations.push(`Consider refactoring ${largeFiles.length} large file(s)`);
    }
    
    const complexFiles = files.filter(f => f.complexity > 20);
    if (complexFiles.length > 0) {
      recommendations.push(`Reduce complexity in ${complexFiles.length} file(s)`);
    }
    
    const securityIssues = issues.filter(i => i.type.includes('security'));
    if (securityIssues.length > 0) {
      recommendations.push(`Address ${securityIssues.length} security issue(s) immediately`);
    }
    
    const avgMaintainability = files.reduce((sum, f) => sum + (f.metrics.maintainabilityIndex || 0), 0) / files.length;
    if (avgMaintainability < 50) {
      recommendations.push('Improve overall code maintainability');
    }
    
    recommendations.push('Add more unit tests to improve coverage');
    recommendations.push('Set up automated code quality checks in CI/CD');
    recommendations.push('Regular code reviews to maintain quality standards');
    
    return recommendations;
  }

  private calculateQualityMetrics(files: FileDiagnostics[]): any {
    const totalFiles = files.length;
    const avgComplexity = files.reduce((sum, f) => sum + f.complexity, 0) / totalFiles;
    const avgMaintainability = files.reduce((sum, f) => sum + (f.metrics.maintainabilityIndex || 0), 0) / totalFiles;
    const avgTestCoverage = files.reduce((sum, f) => sum + (f.metrics.testCoverage || 0), 0) / totalFiles;
    const totalDuplicates = files.reduce((sum, f) => sum + (f.metrics.duplicateLines || 0), 0);
    const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
    
    return {
      averageComplexity: Math.round(avgComplexity * 100) / 100,
      maintainabilityScore: Math.round(avgMaintainability),
      testCoveragePercentage: Math.round(avgTestCoverage),
      duplicateCodePercentage: Math.round((totalDuplicates / totalLines) * 100 * 100) / 100
    };
  }

  private getLanguageFromExtension(extension: string): string {
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.sql': 'sql',
      '.json': 'json',
      '.md': 'markdown',
      '.css': 'css',
      '.scss': 'scss',
      '.html': 'html',
      '.vue': 'vue',
      '.go': 'go',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.rs': 'rust',
      '.sh': 'shell',
      '.yaml': 'yaml',
      '.yml': 'yaml'
    };
    
    return languageMap[extension.toLowerCase()] || 'unknown';
  }
}
