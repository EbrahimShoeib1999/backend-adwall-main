
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('./app'); // Assuming your Express app is exported from app.js
require("dotenv").config({ path: './env.txt' });


// ========================================
// SSL Configuration
// ========================================
// Note: You need to generate your own SSL certificate and key.
// You can use a tool like OpenSSL to generate a self-signed certificate for development.
// For production, you should use a certificate from a trusted Certificate Authority (CA).
//
// Example using OpenSSL to generate a self-signed certificate:
// openssl req -x509 -newkey rsa:2048 -keyout cert.pem -out cert.pem -days 365 -nodes
//
// Once you have the key and certificate, place them in the 'config' directory.
let sslOptions;
try {
  sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'config', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'config', 'cert.pem'))
  };
} catch (error) {
  console.error("SSL certificate files not found. Please generate them and place them in the 'config' directory.");
  console.error("To generate a self-signed certificate for development, run the following command:");
  console.error("openssl req -x509 -newkey rsa:2048 -keyout ./config/key.pem -out ./config/cert.pem -days 365 -nodes -subj \"/C=US/ST=California/L=San Francisco/O=MyCompany/OU=MyOrg/CN=www.adwallpro.com\"");
  // process.exit(1); // Exit if SSL certificates are not found
}

// ========================================
// Create HTTPS server
// ========================================
let httpsServer;
if(sslOptions){
    httpsServer = https.createServer(sslOptions, app);
} else {
    console.warn("Starting server with HTTP because SSL certificates were not found.");
    httpsServer = http.createServer(app);
}


// ========================================
// Create HTTP server for redirection
// ========================================
const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
  res.end();
});

// ========================================
// Start Servers
// ========================================
const HTTPS_PORT = process.env.PORT || 8000;
const HTTP_PORT = 80;

if(sslOptions){
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`HTTPS Server running on https://www.adwallpro.com:${HTTPS_PORT}`);
      });
} else{
    httpServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`HTTPS Server running on http://www.adwallpro.com:${HTTPS_PORT}`);
      });
}


httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`HTTP redirection server running on port ${HTTP_PORT}`);
});
