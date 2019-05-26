/**
 * All the server logic for both the http and https server
 */

const url = require('url');
const { StringDecoder } = require('string_decoder');

const handlers = require('./handlers');
const router = require('./router');

const app = (req, res) => {
  // Get the URL and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  const queryString = parsedUrl.query;

  // Get the HTTP Method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const { headers } = req;

  // Get the payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', data => {
    buffer += decoder.write(data);
  });

  req.on('end', () => {
    buffer += decoder.end();
    // Choose the handler this request should go to. If one is not found, use the notFound handler
    const handler = router[trimmedPath] || handlers.notFound;

    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryString,
      method,
      headers,
      payload: buffer,
    };

    // Route the request to the handler specified in the router
    handler(data, (status = 200, payload = {}) => {
      // Convert the payload to a string
      const payloadString = JSON.stringify(payload);

      // Send the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(status);
      res.end(payloadString);

      // Log the request path
      console.log('Returning this response: ', status, payloadString);
    });
  });
};

module.exports = app;
