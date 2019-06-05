/**
 *  Define a requests router
 */

const handlers = require('./lib/handlers');

const router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

module.exports = router;
