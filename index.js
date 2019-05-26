/**
 * Primary file for the API
 */

//  Dependency
const http = require('http');
const https = require('https');
const fs = require('fs');

const config = require('./lib/config');
const app = require('./app');

// Instantiate the HTTP server
const httpServer = http.createServer(app);

// Start the HTTP server, and have it listen on defined port
httpServer.listen(config.httpPort, () => {
  console.log(`Server is listening on port ${config.httpPort}`);
});

// Instantiate the HTTPS server
const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem'),
};
const httpsServer = https.createServer(httpsServerOptions, app);

// Start the HTTP server, and have it listen on defined port
httpsServer.listen(config.httpsPort, () => {
  console.log(`Server is listening on port ${config.httpsPort}`);
});
