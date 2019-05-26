/**
 *  Define a requests router
 */

const handlers = require('./handlers');

const router = {
  ping: handlers.ping,
  hello: handlers.hello,
};

module.exports = router;
