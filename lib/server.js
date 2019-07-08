/**
 * Server-related tasks
 */

//  Dependencies
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const config = require('./config');
const app = require('../app');

// Instantiate the server module object
const server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer(app);

// Instantiate the HTTPS server
const httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../https/cert.pem')),
};
server.httpsServer = https.createServer(httpsServerOptions, app);

// Init script
server.init = () => {
  // Start the HTTP server, and have it listen on defined port
  server.httpServer.listen(config.httpPort, () => {
    console.log(
      '\x1b[36m%s\x1b[0m',
      `Server is listening on port ${config.httpPort}`
    );
  });

  // Start the HTTPS server, and have it listen on defined port
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(
      '\x1b[35m%s\x1b[0m',
      `Server is listening on port ${config.httpsPort}`
    );
  });
};

module.exports = server;
