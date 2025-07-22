
const fs = require('fs');
const path = require('path');

// Common duplicate patterns to check
const duplicatePatterns = {
  // Authentication middleware patterns
  authMiddleware: /const\s+authenticateToken\s*=\s*async\s*\([^)]*\)\s*=>\s*{[\s\S]*?};?/g,
  
  // Database query patterns
  dbQueries: /await\s+pool\.query\([^)]+\)/g,
  
  // Error handling patterns
  errorHandling: /try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)\s*{[\s\S]*?}/g,
  
  // Import statements
  imports: /import\s+.*?from\s+['"][^'"]+['"]/g,
  
  // React component patterns
  reactComponents: /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{[\s\S]*?return[\s\S]*?};?/g,
  
  // Express route handlers
  expressRoutes: /router\.\w+\(['"][^'"]*['"],?\s*[^,]*,?\s*async\s*\([^)]*\)\s*=>\s*{[\s\S]*?}\);?/g,
  
  // Database connection patterns
  dbConnections: /new Pool\([^)]*\)/g,
  
  // API response patterns
  apiResponses: /res\.(json|status|send)\([^)]*\)/g
};

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = {};
    
    for (const [patternName, pattern] of Object.entries(duplicatePatterns)) {
      const matches = content.match(pattern);
      if (matches && matches.length > 1) {
        results[patternName] = matches;
      }
    }
    
    return results;
  } catch (error) {
    return null;
  }
}

function findDuplicateCode() {
  const duplicates = {};
  const fileExtensions = ['.ts', '.tsx', '.js', '.py'];
  
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scanDirectory(filePath);
      } else if (stat.isFile() && fileExtensions.some(ext => file.endsWith(ext))) {
        const results = analyzeFile(filePath);
        if (results && Object.keys(results).length > 0) {
          duplicates[filePath] = results;
        }
      }
    }
  }
  
  scanDirectory('.');
  return duplicates;
}

// Cross-file duplicate detection
function findCrossFileDuplicates() {
  const codeBlocks = {};
  const fileExtensions = ['.ts', '.tsx', '.js'];
  
  function scanForCommonCode(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scanForCommonCode(filePath);
      } else if (stat.isFile() && fileExtensions.some(ext => file.endsWith(ext))) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Extract function definitions
          const functions = content.match(/(?:export\s+)?(?:const|function)\s+\w+[^{]*{[^{}]*(?:{[^{}]*}[^{}]*)*}/g);
          if (functions) {
            functions.forEach(func => {
              const signature = func.substring(0, Math.min(100, func.length));
              if (!codeBlocks[signature]) {
                codeBlocks[signature] = [];
              }
              codeBlocks[signature].push({ file: filePath, code: func });
            });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  }
  
  scanForCommonCode('.');
  
  // Find duplicates
  const crossFileDuplicates = {};
  for (const [signature, occurrences] of Object.entries(codeBlocks)) {
    if (occurrences.length > 1) {
      crossFileDuplicates[signature] = occurrences;
    }
  }
  
  return crossFileDuplicates;
}

console.log('🔍 Analyzing codebase for duplicate patterns...\n');

const withinFileDuplicates = findDuplicateCode();
const crossFileDuplicates = findCrossFileDuplicates();

console.log('📊 DUPLICATE CODE ANALYSIS REPORT');
console.log('='.repeat(50));

if (Object.keys(withinFileDuplicates).length > 0) {
  console.log('\n🔄 WITHIN-FILE DUPLICATES:');
  for (const [filePath, patterns] of Object.entries(withinFileDuplicates)) {
    console.log(`\n📄 ${filePath}:`);
    for (const [patternName, matches] of Object.entries(patterns)) {
      console.log(`  • ${patternName}: ${matches.length} occurrences`);
    }
  }
} else {
  console.log('\n✅ No within-file duplicates detected.');
}

if (Object.keys(crossFileDuplicates).length > 0) {
  console.log('\n🔗 CROSS-FILE DUPLICATES:');
  let count = 1;
  for (const [signature, occurrences] of Object.entries(crossFileDuplicates)) {
    if (count <= 10) { // Limit output
      console.log(`\n${count}. Similar code found in ${occurrences.length} files:`);
      occurrences.forEach(occ => {
        console.log(`   📄 ${occ.file}`);
      });
      console.log(`   Code preview: ${signature.substring(0, 80)}...`);
    }
    count++;
  }
  if (count > 11) {
    console.log(`\n... and ${count - 11} more duplicate patterns`);
  }
} else {
  console.log('\n✅ No cross-file duplicates detected.');
}

// Specific analysis for your codebase
console.log('\n🎯 SPECIFIC DUPLICATE PATTERNS FOUND:');

// Check for auth middleware duplications
const authFiles = ['server/routes.ts', 'server/middleware/auth-middleware.ts'];
let authDuplicates = 0;

authFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const authMatches = content.match(/const\s+authenticateToken\s*=/g);
    if (authMatches && authMatches.length > 0) {
      authDuplicates++;
      console.log(`❗ Authentication middleware defined in: ${file}`);
    }
  }
});

if (authDuplicates > 1) {
  console.log('⚠️  RECOMMENDATION: Consolidate authentication middleware into a single module');
}

// Check for database connection patterns
const dbFiles = ['server/db.ts', 'server/storage.ts'];
let dbConnections = 0;

dbFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('new Pool(') || content.includes('createPool(')) {
      dbConnections++;
      console.log(`❗ Database connection pattern in: ${file}`);
    }
  }
});

// Check for common utility functions
const utilityPatterns = [
  'ResponseUtils',
  'AuthUtils', 
  'UserUtils',
  'DatabaseUtils'
];

utilityPatterns.forEach(pattern => {
  let occurrences = 0;
  const files = [];
  
  function checkPattern(dir) {
    const dirFiles = fs.readdirSync(dir);
    
    for (const file of dirFiles) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        checkPattern(filePath);
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.js'))) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes(pattern)) {
            occurrences++;
            files.push(filePath);
          }
        } catch (error) {
          // Skip
        }
      }
    }
  }
  
  checkPattern('.');
  
  if (occurrences > 3) {
    console.log(`❗ ${pattern} utility used in ${occurrences} files - consider centralizing`);
  }
});

console.log('\n💡 RECOMMENDATIONS:');
console.log('1. Move authentication middleware to a single reusable module');
console.log('2. Centralize database connection logic');
console.log('3. Create shared utility functions for common operations');
console.log('4. Use consistent error handling patterns');
console.log('5. Consolidate similar API response structures');

console.log('\n✨ Analysis complete!');
