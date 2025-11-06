
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
    const fullPath = `/${routerName}${routePath}`.replace('//', '/');

    folder.item.push({
      name: `${method} ${fullPath}`,
      request: {
        method,
        header: [],
        url: {
          raw: `{{baseUrl}}${fullPath}`,
          host: ['{{baseUrl}}'],
          path: fullPath.split('/').filter(p => p),
        },
      },
      response: [],
    });
  }

  if (folder.item.length > 0) {
    collection.item.push(folder);
  }
});

fs.writeFileSync('postman_collection.json', JSON.stringify(collection, null, 2));
console.log('Postman collection generated successfully!');
