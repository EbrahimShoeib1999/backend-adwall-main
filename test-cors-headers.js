// Test CORS Headers - Run this to verify CORS is working
// Usage: node test-cors-headers.js

const http = require('http');
const https = require('https');

const testEndpoints = [
  {
    name: 'Local Server',
    url: 'http://127.0.0.1:8000/api/v1/categories?page=1&limit=16',
    origin: 'https://adwallpro.vercel.app'
  },
  {
    name: 'Production API',
    url: 'https://api.adwallpro.com/api/v1/categories?page=1&limit=16',
    origin: 'https://adwallpro.vercel.app'
  }
];

function testCORS(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.url);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Origin': endpoint.origin,
        'Accept': 'application/json'
      }
    };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${endpoint.name}`);
    console.log(`URL: ${endpoint.url}`);
    console.log(`Origin: ${endpoint.origin}`);
    console.log(`${'='.repeat(60)}`);

    const req = protocol.request(options, (res) => {
      console.log(`\n✅ Status Code: ${res.statusCode}`);
      console.log(`\n📋 Response Headers:`);
      
      const corsHeaders = {
        'access-control-allow-origin': res.headers['access-control-allow-origin'],
        'access-control-allow-credentials': res.headers['access-control-allow-credentials'],
        'access-control-allow-methods': res.headers['access-control-allow-methods'],
        'access-control-allow-headers': res.headers['access-control-allow-headers'],
        'access-control-expose-headers': res.headers['access-control-expose-headers']
      };

      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (value) {
          console.log(`   ✓ ${key}: ${value}`);
        } else {
          console.log(`   ✗ ${key}: MISSING ❌`);
        }
      });

      // Check if CORS is properly configured
      const hasOrigin = corsHeaders['access-control-allow-origin'] === endpoint.origin;
      const hasCredentials = corsHeaders['access-control-allow-credentials'] === 'true';
      
      console.log(`\n🔍 CORS Validation:`);
      console.log(`   ${hasOrigin ? '✓' : '✗'} Origin matches: ${hasOrigin ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   ${hasCredentials ? '✓' : '✗'} Credentials enabled: ${hasCredentials ? 'YES ✅' : 'NO ❌'}`);
      
      if (hasOrigin && hasCredentials) {
        console.log(`\n🎉 CORS is properly configured for ${endpoint.name}!`);
      } else {
        console.log(`\n⚠️  CORS configuration issue detected for ${endpoint.name}`);
      }

      resolve();
    });

    req.on('error', (error) => {
      console.log(`\n❌ Error: ${error.message}`);
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log('\n🧪 CORS Headers Test Suite\n');
  
  for (const endpoint of testEndpoints) {
    await testCORS(endpoint);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between tests
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ All tests completed!');
  console.log(`${'='.repeat(60)}\n`);
}

runTests();
