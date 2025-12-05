// Quick CORS Test - Check what headers are actually being sent
const https = require('https');

const options = {
  hostname: 'api.adwallpro.com',
  path: '/api/v1/categories?page=1&limit=16',
  method: 'GET',
  headers: {
    'Origin': 'https://adwallpro.vercel.app',
    'Accept': 'application/json'
  }
};

console.log('Testing: https://api.adwallpro.com/api/v1/categories?page=1&limit=16');
console.log('Origin: https://adwallpro.vercel.app\n');

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('\n=== ALL RESPONSE HEADERS ===');
  console.log(JSON.stringify(res.headers, null, 2));
  
  console.log('\n=== CORS HEADERS CHECK ===');
  const corsHeaders = [
    'access-control-allow-origin',
    'access-control-allow-credentials',
    'access-control-allow-methods',
    'access-control-allow-headers'
  ];
  
  corsHeaders.forEach(header => {
    const value = res.headers[header];
    if (value) {
      console.log(`✅ ${header}: ${value}`);
    } else {
      console.log(`❌ ${header}: MISSING`);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
