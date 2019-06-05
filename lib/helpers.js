/**
 * Helpers for various tasks
 */

const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

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

// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = length => {
  const strLength = typeof length === 'number' && length ? length : false;
  if (strLength) {
    // Define all tha possible characters that could go into the string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    let str = '';
    for (let i = 0; i < strLength; i += 1) {
      // Get a random character from the possibleCharacters string
      const randomCharacter = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );
      // Append this character to the final string
      str += randomCharacter;
    }
    return str;
  }
  return false;
};

// Send an SMS message via Twilio
helpers.sendTwilioSms = (phone, msg, cb) => {
  // Validate parameters
  const phoneNumber =
    typeof phone === 'string' && phone.trim().length === 10
      ? phone.trim()
      : false;
  const smsMsg =
    typeof msg === 'string' &&
    msg.trim().length > 0 &&
    msg.trim().length <= 1600
      ? msg.trim()
      : false;

  if (phoneNumber && smsMsg) {
    // Configure the request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: `+57${phoneNumber}`,
      Body: smsMsg,
    };

    // Stringify the payload
    const stringPayload = querystring.stringify(payload);

    // Configure the request details
    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload),
      },
    };

    // Instantiate the request object
    const req = https.request(requestDetails, res => {
      // Grab the status of the sent request
      const status = res.statusCode;
      // Callback successfully if the request went through
      if (status === 200 || status === 201) {
        cb(null);
      } else {
        cb(new Error(`Status code returned was ${status}`));
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', err => {
      cb(err);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();
  } else {
    cb(new Error('Required parameters were missing or invalid'));
  }
};

module.exports = helpers;
