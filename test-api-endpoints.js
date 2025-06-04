
const http = require('http');

const testEndpoints = [
  '/api/health',
  '/api/tickets',
  '/api/tickets?page=1&limit=5'
];

async function testAPI() {
  console.log('🔍 Testing API endpoints...\n');
  
  for (const endpoint of testEndpoints) {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:5000${endpoint}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          }));
        });
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Timeout')));
      });
      
      console.log(`✅ ${endpoint}: Status ${response.status}`);
      if (endpoint.includes('tickets')) {
        try {
          const json = JSON.parse(response.data);
          if (Array.isArray(json)) {
            console.log(`   📋 Found ${json.length} tickets`);
          } else if (json.data) {
            console.log(`   📋 Found ${json.data.length} tickets (paginated)`);
          }
        } catch (e) {
          console.log(`   ⚠️  Response not valid JSON`);
        }
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
  }
}

testAPI().catch(console.error);
