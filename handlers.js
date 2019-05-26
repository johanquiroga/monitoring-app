/**
 * Define the handlers
 */

const handlers = {};

handlers.ping = (data, cb) => {
  cb(200);
};

handlers.hello = (data, cb) => {
  cb(200, { message: 'Hello World!' });
};

handlers.notFound = (data, cb) => {
  cb(404);
};

module.exports = handlers;
