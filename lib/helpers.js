/**
 * Helpers for various tasks
 */

const crypto = require('crypto');

const config = require('./config');

const helpers = {};

// Create a SHA256 Hash
helpers.hash = str => {
  if (typeof str === 'string' && str.length) {
    const hash = crypto
      .createHmac('sha256', config.hashSecret)
      .update(str)
      .digest('hex');
    return hash;
  }
  return false;
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = str => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

module.exports = helpers;
