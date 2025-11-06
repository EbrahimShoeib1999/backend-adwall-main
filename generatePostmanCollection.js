const fs = require('fs');
const path = require('path');

const routerDir = path.join(__dirname, 'router');
const collection = {
  info: {
    name: 'AdWall API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [],
};

const payloads = {
  '/api/v1/auth/signup': {
    mode: 'raw',
    raw: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
    }, null, 2),
    options: { raw: { language: 'json' } },
  },
  '/api/v1/auth/login': {
    mode: 'raw',
    raw: JSON.stringify({
      email: 'test@example.com',
      password: 'password123',
    }, null, 2),
    options: { raw: { language: 'json' } },
  },
  '/api/v1/auth/forgotPassword': {
    mode: 'raw',
    raw: JSON.stringify({
      email: 'test@example.com',
    }, null, 2),
    options: { raw: { language: 'json' } },
  },
    '/api/v1/auth/verifyResetCode': {
    mode: 'raw',
    raw: JSON.stringify({
      resetCode: '123456',
    }, null, 2),
    options: { raw: { language: 'json' } },
  },
  '/api/v1/auth/resetPassword': {
    mode: 'raw',
    raw: JSON.stringify({
      email: 'test@example.com',
      newPassword: 'newpassword123',
    }, null, 2),
    options: { raw: { language: 'json' } },
  },
  '/api/v1/categories': {
    mode: 'formdata',
    formdata: [
      { key: 'name', value: 'Test Category', type: 'text' },
      { key: 'image', type: 'file', src: '' },
    ],
  },
    '/api/v1/companies': {
    mode: 'formdata',
    formdata: [
      { key: 'companyName', value: 'Test Company', type: 'text' },
      { key: 'companyNameTr', value: 'Test Şirketi', type: 'text' },
      { key: 'description', value: 'This is a test company.', type: 'text' },
      { key: 'descriptionTr', value: 'Bu bir test şirketidir.', type: 'text' },
      { key: 'country', value: 'Turkey', type: 'text' },
      { key: 'city', value: 'Istanbul', type: 'text' },
      { key: 'email', value: 'company@example.com', type: 'text' },
      { key: 'categoryId', value: '60f6e1b3b3f3b3b3b3f3b3b3', type: 'text' },
      { key: 'whatsapp', value: '905555555555', type: 'text' },
      { key: 'website', value: 'https://example.com', type: 'text' },
      { key: 'logo', type: 'file', src: '' },
    ],
  },
  '/api/v1/coupons': {
    mode: 'raw',
    raw: JSON.stringify({
      name: 'TESTCOUPON',
      expire: '2025-12-31',
      discount: 10,
    }, null, 2),
    options: { raw: { language: 'json' } },
  },
    '/api/v1/reviews': {
    mode: 'raw',
    raw: JSON.stringify({
      title: 'Great Company!',
      ratings: 5,
    }, null, 2),
    options: { raw: { language: 'json' } },
  },
  '/api/v1/plans': {
    mode: 'raw',
    raw: JSON.stringify({
      name: 'Basic Plan',
      price: 10,
      duration: 30,
      description: 'This is a basic plan.',
    }, null, 2),
    options: { raw: { language: 'json' } },
  },
  '/api/v1/users': {
    mode: 'raw',
    raw: JSON.stringify({
      name: 'New User',
      email: 'newuser@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
      phone: '1234567890',
      role: 'user',
    }, null, 2),
    options: { raw: { language: 'json' } },
  },
};

const routeFiles = fs.readdirSync(routerDir).filter(file => file.endsWith('.js') && file !== 'index.js');

routeFiles.forEach(file => {
  const filePath = path.join(routerDir, file);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const routerName = file.replace('Route.js', '');

  const folder = {
    name: routerName.charAt(0).toUpperCase() + routerName.slice(1),
    item: [],
  };

  const regex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`](.*?)['"`]/g;
  let match;

  while ((match = regex.exec(fileContent)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    const fullPath = `/api/v1/${routerName}${routePath}`.replace('//', '/');

    const request = {
      method,
      header: [],
      url: {
        raw: `{{baseUrl}}${fullPath}`,
        host: ['{{baseUrl}}'],
        path: fullPath.split('/').filter(p => p),
      },
    };

    const payloadKey = Object.keys(payloads).find(key => fullPath.startsWith(key) && (method === 'POST' || method === 'PUT'));
    if (payloadKey) {
        request.body = payloads[payloadKey];
    }


    folder.item.push({
      name: `${method} ${fullPath}`,
      request,
      response: [],
    });
  }

  if (folder.item.length > 0) {
    collection.item.push(folder);
  }
});

fs.writeFileSync('postman_collection.json', JSON.stringify(collection, null, 2));
console.log('Postman collection generated successfully!');