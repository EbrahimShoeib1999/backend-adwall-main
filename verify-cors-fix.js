// Verify CORS Configuration in app.js
// Run this on your VPS to check if the CORS fix is present

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking CORS Configuration...\n');

const appJsPath = path.join(__dirname, 'app.js');

if (!fs.existsSync(appJsPath)) {
  console.log('❌ app.js not found!');
  process.exit(1);
}

const content = fs.readFileSync(appJsPath, 'utf8');

// Check for key CORS indicators
const checks = [
  {
    name: 'Manual CORS Headers Middleware',
    pattern: /res\.setHeader\('Access-Control-Allow-Origin'/,
    required: true
  },
  {
    name: 'Origin Header Check',
    pattern: /const origin = req\.headers\.origin/,
    required: true
  },
  {
    name: 'Allowed Origins Array',
    pattern: /const allowedOrigins = \[/,
    required: true
  },
  {
    name: 'Vercel App in Allowed Origins',
    pattern: /https:\/\/adwallpro\.vercel\.app/,
    required: true
  },
  {
    name: 'OPTIONS Preflight Handler',
    pattern: /if \(req\.method === 'OPTIONS'\)/,
    required: true
  },
  {
    name: 'CORS Package',
    pattern: /app\.use\(cors\(corsOptions\)\)/,
    required: true
  }
];

let allPassed = true;

checks.forEach(check => {
  const found = check.pattern.test(content);
  const status = found ? '✅' : '❌';
  const label = check.required ? '(Required)' : '(Optional)';
  
  console.log(`${status} ${check.name} ${label}`);
  
  if (check.required && !found) {
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✅ CORS configuration is CORRECT!');
  console.log('\nThe app.js file has all the required CORS fixes.');
  console.log('If you\'re still seeing CORS errors:');
  console.log('1. Make sure you restarted the Node.js application');
  console.log('2. Check if this is the correct app.js file being used');
  console.log('3. Check the application logs for errors');
} else {
  console.log('❌ CORS configuration is INCOMPLETE!');
  console.log('\nThe app.js file is missing required CORS fixes.');
  console.log('You need to update app.js with the enhanced CORS configuration.');
}

console.log('='.repeat(50) + '\n');

// Show first 50 lines of app.js for verification
console.log('📄 First 50 lines of app.js:\n');
const lines = content.split('\n').slice(0, 50);
lines.forEach((line, index) => {
  console.log(`${(index + 1).toString().padStart(3, ' ')}: ${line}`);
});
