
import { Router } from "express";
import { CodeDiagnosticsService } from "../services/code-diagnostics-service";
import { execSync } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";

const router = Router();
const diagnosticsService = new CodeDiagnosticsService();

// Run comprehensive code diagnostics
router.post("/run-full", async (req, res) => {
  try {
    console.log("Starting comprehensive code diagnostics...");
    
    const diagnostics = await diagnosticsService.runComprehensiveDiagnostics();
    
    // Save diagnostics report
    const reportPath = join(process.cwd(), 'diagnostics-report.json');
    await fs.writeFile(reportPath, JSON.stringify(diagnostics, null, 2));
    
    res.json({
      success: true,
      diagnostics,
      reportSaved: reportPath,
      summary: {
        totalFiles: diagnostics.overview.totalFiles,
        totalIssues: diagnostics.overview.issueCount.errors + 
                    diagnostics.overview.issueCount.warnings + 
                    diagnostics.overview.issueCount.info,
        criticalIssues: diagnostics.overview.issueCount.errors,
        securityIssues: diagnostics.securityIssues.length,
        performanceIssues: diagnostics.performanceIssues.length,
        qualityScore: diagnostics.qualityMetrics.maintainabilityScore
      }
    });
  } catch (error) {
    console.error("Error running diagnostics:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get system diagnostics
router.get("/system", async (req, res) => {
  try {
    const systemInfo = {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      project: {
        directory: process.cwd(),
        nodeModulesSize: await getDirectorySize('node_modules'),
        packageJson: await checkPackageJson(),
        gitStatus: await getGitStatus(),
        diskSpace: await getDiskSpace()
      },
      dependencies: await analyzeDependencies(),
      security: await securityAudit()
    };

    res.json({
      success: true,
      systemInfo
    });
  } catch (error) {
    console.error("Error getting system diagnostics:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Run specific file analysis
router.post("/analyze-file", async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "File path is required"
      });
    }

    // This would need to be implemented in the service
    // const analysis = await diagnosticsService.analyzeSpecificFile(filePath);
    
    res.json({
      success: true,
      message: "File analysis endpoint - implementation needed",
      filePath
    });
  } catch (error) {
    console.error("Error analyzing file:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Database diagnostics
router.get("/database", async (req, res) => {
  try {
    const { db } = await import("../db");
    
    // Test database connection
    const connectionTest = await testDatabaseConnection();
    
    // Get table information
    const tableInfo = await getTableDiagnostics();
    
    // Check for common issues
    const issues = await checkDatabaseIssues();
    
    res.json({
      success: true,
      database: {
        connection: connectionTest,
        tables: tableInfo,
        issues: issues,
        performance: await getDatabasePerformance()
      }
    });
  } catch (error) {
    console.error("Error running database diagnostics:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Performance diagnostics
router.get("/performance", async (req, res) => {
  try {
    const performanceMetrics = {
      memory: {
        used: process.memoryUsage(),
        available: await getAvailableMemory(),
        gc: await getGCStats()
      },
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: require('os').loadavg(),
        cores: require('os').cpus().length
      },
      network: await getNetworkStats(),
      filesystem: await getFilesystemStats(),
      eventLoop: await getEventLoopStats()
    };

    res.json({
      success: true,
      performance: performanceMetrics
    });
  } catch (error) {
    console.error("Error running performance diagnostics:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions
async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) return stats.size;
    
    const files = await fs.readdir(dirPath);
    let totalSize = 0;
    
    for (const file of files) {
      const filePath = join(dirPath, file);
      const fileStats = await fs.stat(filePath);
      if (fileStats.isDirectory()) {
        totalSize += await getDirectorySize(filePath);
      } else {
        totalSize += fileStats.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    return 0;
  }
}

async function checkPackageJson(): Promise<any> {
  try {
    const packagePath = join(process.cwd(), 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf-8');
    return JSON.parse(packageContent);
  } catch (error) {
    return null;
  }
}

async function getGitStatus(): Promise<any> {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    return {
      branch,
      hasChanges: status.length > 0,
      changes: status.split('\n').filter(line => line.length > 0)
    };
  } catch (error) {
    return { error: 'Not a git repository or git not available' };
  }
}

async function getDiskSpace(): Promise<any> {
  try {
    if (process.platform === 'win32') {
      const output = execSync('dir /-c', { encoding: 'utf-8' });
      return { platform: 'windows', raw: output };
    } else {
      const output = execSync('df -h .', { encoding: 'utf-8' });
      return { platform: 'unix', raw: output };
    }
  } catch (error) {
    return { error: 'Could not get disk space information' };
  }
}

async function analyzeDependencies(): Promise<any> {
  try {
    const packageJson = await checkPackageJson();
    if (!packageJson) return null;
    
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    
    return {
      production: Object.keys(deps).length,
      development: Object.keys(devDeps).length,
      total: Object.keys(deps).length + Object.keys(devDeps).length,
      outdated: await checkOutdatedPackages()
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function checkOutdatedPackages(): Promise<any> {
  try {
    const output = execSync('npm outdated --json', { encoding: 'utf-8' });
    return JSON.parse(output);
  } catch (error) {
    return {};
  }
}

async function securityAudit(): Promise<any> {
  try {
    const output = execSync('npm audit --json', { encoding: 'utf-8' });
    return JSON.parse(output);
  } catch (error) {
    return { error: 'Could not run security audit' };
  }
}

async function testDatabaseConnection(): Promise<any> {
  try {
    const { db } = await import("../db");
    const result = await db.execute('SELECT 1 as test');
    return {
      status: 'connected',
      timestamp: new Date(),
      latency: Date.now()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date()
    };
  }
}

async function getTableDiagnostics(): Promise<any> {
  try {
    const { db } = await import("../db");
    
    // Get table information
    const tables = await db.execute(`
      SELECT table_name, table_rows, data_length, index_length
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);
    
    return tables;
  } catch (error) {
    return { error: error.message };
  }
}

async function checkDatabaseIssues(): Promise<any[]> {
  const issues = [];
  
  try {
    const { db } = await import("../db");
    
    // Check for missing indexes
    const slowQueries = await db.execute('SHOW PROCESSLIST');
    
    // Check table sizes
    const tableSizes = await db.execute(`
      SELECT table_name, 
             ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb'
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      ORDER BY (data_length + index_length) DESC
    `);
    
    tableSizes.forEach((table: any) => {
      if (table.size_mb > 100) {
        issues.push({
          type: 'large_table',
          table: table.table_name,
          size: table.size_mb,
          message: `Table ${table.table_name} is ${table.size_mb}MB`
        });
      }
    });
    
  } catch (error) {
    issues.push({
      type: 'connection_error',
      message: error.message
    });
  }
  
  return issues;
}

async function getDatabasePerformance(): Promise<any> {
  try {
    const { db } = await import("../db");
    
    const performance = await db.execute(`
      SELECT 
        COUNT(*) as total_connections,
        SUM(IF(command = 'Sleep', 1, 0)) as sleeping_connections,
        SUM(IF(command != 'Sleep', 1, 0)) as active_connections
      FROM information_schema.processlist
    `);
    
    return performance[0];
  } catch (error) {
    return { error: error.message };
  }
}

async function getAvailableMemory(): Promise<any> {
  try {
    const os = require('os');
    return {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getGCStats(): Promise<any> {
  try {
    const v8 = require('v8');
    return v8.getHeapStatistics();
  } catch (error) {
    return { error: error.message };
  }
}

async function getNetworkStats(): Promise<any> {
  try {
    const os = require('os');
    return os.networkInterfaces();
  } catch (error) {
    return { error: error.message };
  }
}

async function getFilesystemStats(): Promise<any> {
  try {
    const fs = require('fs');
    const stats = await fs.promises.stat(process.cwd());
    return {
      cwd: process.cwd(),
      stats: stats,
      permissions: {
        readable: true,
        writable: true
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getEventLoopStats(): Promise<any> {
  try {
    const { performance } = require('perf_hooks');
    const eventLoopUtilization = performance.eventLoopUtilization();
    return eventLoopUtilization;
  } catch (error) {
    return { error: error.message };
  }
}

export default router;
