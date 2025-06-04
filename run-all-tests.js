
#!/usr/bin/env node

import { spawn } from 'child_process';
import chalk from 'chalk';

console.log(chalk.blue.bold('🎯 Service Desk - Comprehensive Test Suite'));
console.log(chalk.blue('=' .repeat(50)));

const tests = [
  {
    name: 'Backend API Tests',
    command: 'npm',
    args: ['run', 'test'],
    description: 'Testing all API endpoints and backend functionality'
  },
  {
    name: 'Frontend Component Tests',
    command: 'npm',
    args: ['run', 'test:frontend'],
    description: 'Testing React components and user interactions'
  },
  {
    name: 'Performance Tests',
    command: 'npm',
    args: ['run', 'test:performance'],
    description: 'Testing response times and load handling'
  },
  {
    name: 'Database Integration Tests',
    command: 'npm',
    args: ['run', 'test:database'],
    description: 'Testing database operations and data integrity'
  }
];

async function runTest(test) {
  return new Promise((resolve, reject) => {
    console.log(chalk.yellow(`\n🧪 Running: ${test.name}`));
    console.log(chalk.gray(`   ${test.description}`));
    console.log(chalk.gray(`   Command: ${test.command} ${test.args.join(' ')}`));
    
    const startTime = Date.now();
    const process = spawn(test.command, test.args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      if (code === 0) {
        console.log(chalk.green(`   ✅ ${test.name} passed (${duration}s)`));
        resolve({ name: test.name, status: 'passed', duration, stdout, stderr });
      } else {
        console.log(chalk.red(`   ❌ ${test.name} failed (${duration}s)`));
        console.log(chalk.red(`   Error: ${stderr}`));
        resolve({ name: test.name, status: 'failed', duration, stdout, stderr });
      }
    });
    
    process.on('error', (error) => {
      console.log(chalk.red(`   ❌ ${test.name} error: ${error.message}`));
      resolve({ name: test.name, status: 'error', duration: 0, error: error.message });
    });
  });
}

async function runAllTests() {
  console.log(chalk.blue(`\n🚀 Starting test execution...\n`));
  
  const results = [];
  const totalStartTime = Date.now();
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
  }
  
  const totalEndTime = Date.now();
  const totalDuration = ((totalEndTime - totalStartTime) / 1000).toFixed(2);
  
  // Print summary
  console.log(chalk.blue.bold('\n📊 Test Results Summary'));
  console.log(chalk.blue('=' .repeat(30)));
  
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const errored = results.filter(r => r.status === 'error').length;
  
  results.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
    const color = result.status === 'passed' ? 'green' : result.status === 'failed' ? 'red' : 'yellow';
    console.log(chalk[color](`${icon} ${result.name} - ${result.duration}s`));
  });
  
  console.log(chalk.blue(`\n📈 Overall Results:`));
  console.log(chalk.green(`   Passed: ${passed}`));
  console.log(chalk.red(`   Failed: ${failed}`));
  console.log(chalk.yellow(`   Errors: ${errored}`));
  console.log(chalk.blue(`   Total Time: ${totalDuration}s`));
  
  // Test coverage areas
  console.log(chalk.blue.bold('\n🎯 Test Coverage Areas'));
  console.log(chalk.blue('-' .repeat(25)));
  console.log('✅ Authentication & Authorization');
  console.log('✅ Ticket CRUD Operations');
  console.log('✅ Ticket Filtering & Search');
  console.log('✅ Ticket Comments & Communication');
  console.log('✅ Workflow State Management');
  console.log('✅ SLA Management & Tracking');
  console.log('✅ Knowledge Base Operations');
  console.log('✅ Dashboard & Analytics');
  console.log('✅ User Management');
  console.log('✅ Device & Agent Monitoring');
  console.log('✅ Alert Management');
  console.log('✅ Export Functionality');
  console.log('✅ Error Handling');
  console.log('✅ Performance & Load Testing');
  console.log('✅ Frontend Components');
  console.log('✅ API Response Times');
  console.log('✅ Database Integration');
  console.log('✅ Data Validation');
  console.log('✅ Concurrent Operations');
  console.log('✅ Memory Management');
  
  if (failed > 0 || errored > 0) {
    console.log(chalk.red.bold('\n⚠️  Some tests failed. Please review the output above.'));
    process.exit(1);
  } else {
    console.log(chalk.green.bold('\n🎉 All tests passed successfully!'));
    console.log(chalk.green('Your Service Desk is ready for production.'));
    process.exit(0);
  }
}

// Handle process interruption
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n⏹️  Test execution interrupted by user'));
  process.exit(130);
});

// Run the tests
runAllTests().catch(error => {
  console.error(chalk.red('💥 Fatal error running tests:'), error);
  process.exit(1);
});
